-- =============================================================
-- sync-schema-staging.sql
-- Sincroniza o banco staging (d5ea2e96_tst) com o schema.ts atual
-- Gerado em: 2026-05-13 | Fase: diagnóstico pós 3.7.1a
--
-- EXECUTAR APENAS EM STAGING (d5ea2e96_tst).
-- NÃO executar em produção sem antes completar o checklist em
-- PENDENCIAS_DEPLOY_PRODUCAO.md
--
-- Todas as 14 mudanças foram validadas como seguras:
--   - Zero NULLs nas colunas que recebem NOT NULL
--   - Maior technicianSignature tem 38 KB (limite text = 65 KB)
--   - Dados de unique constraints já são únicos em produção
-- =============================================================


-- -------------------------------------------------------------
-- BLOCO 1 — Constraints UNIQUE ausentes no staging (4 itens)
-- Risco: zero. Dados já são únicos por design.
-- -------------------------------------------------------------

-- 1. budgets.budgetNumber: formato ORC-YYYY-NNN, sempre único
ALTER TABLE `budgets`
  ADD UNIQUE INDEX `budgets_budgetNumber_unique` (`budgetNumber`);

-- 2. budgets.approvalToken: UUID aleatório, impossível duplicata
ALTER TABLE `budgets`
  ADD UNIQUE INDEX `budgets_approvalToken_unique` (`approvalToken`);

-- 3. technicians.username: só há 1 técnico no staging
ALTER TABLE `technicians`
  ADD UNIQUE INDEX `technicians_username_unique` (`username`);

-- 4. waterTankSensors.deviceId: identificador único do ESP32
ALTER TABLE `waterTankSensors`
  ADD UNIQUE INDEX `waterTankSensors_deviceId_unique` (`deviceId`);


-- -------------------------------------------------------------
-- BLOCO 2 — Mudanças de tipo de coluna (2 itens)
-- Risco: zero. Tinyint→int é alargamento. Longtext→text
-- verificado: maior valor = 38 KB (limite = 65 KB).
-- -------------------------------------------------------------

-- 5. budgets.sharedWithPortal: tinyint → int (alargamento seguro)
ALTER TABLE `budgets`
  MODIFY COLUMN `sharedWithPortal` INT NOT NULL DEFAULT 0;

-- 6. workOrders.technicianSignature: longtext → text
--    (38 KB máx verificado; limite text = 65.535 bytes)
ALTER TABLE `workOrders`
  MODIFY COLUMN `technicianSignature` TEXT;


-- -------------------------------------------------------------
-- BLOCO 3 — NOT NULL em colunas já preenchidas (6 itens)
-- Risco: zero. Verificação confirmou 0 NULLs em todas.
-- -------------------------------------------------------------

-- 7. cashTransactions.type: enum sem NOT NULL no banco
ALTER TABLE `cashTransactions`
  MODIFY COLUMN `type` ENUM('entrada', 'saida') NOT NULL;

-- 8. cashTransactions.amount: decimal sem NOT NULL no banco
ALTER TABLE `cashTransactions`
  MODIFY COLUMN `amount` DECIMAL(10, 2) NOT NULL;

-- 9. saleItems.productName: varchar sem NOT NULL no banco
ALTER TABLE `saleItems`
  MODIFY COLUMN `productName` VARCHAR(255) NOT NULL;

-- 10. saleItems.unitPrice: decimal sem NOT NULL no banco
ALTER TABLE `saleItems`
  MODIFY COLUMN `unitPrice` DECIMAL(10, 2) NOT NULL;

-- 11. saleItems.subtotal: decimal sem NOT NULL no banco
ALTER TABLE `saleItems`
  MODIFY COLUMN `subtotal` DECIMAL(10, 2) NOT NULL;

-- 12. sales.total: decimal sem NOT NULL no banco
ALTER TABLE `sales`
  MODIFY COLUMN `total` DECIMAL(10, 2) NOT NULL;


-- -------------------------------------------------------------
-- BLOCO 4 — Remover DEFAULT de colunas NOT NULL (2 itens)
-- Risco: zero para dados existentes. Afeta apenas inserts
-- manuais sem a coluna — o código sempre envia o valor.
-- -------------------------------------------------------------

-- 13. waterTankAlertLog.direction: remover DEFAULT implícito
ALTER TABLE `waterTankAlertLog`
  MODIFY COLUMN `direction` ENUM('down', 'up') NOT NULL;

-- 14. waterTankAlertLog.tankType: remover DEFAULT implícito
ALTER TABLE `waterTankAlertLog`
  MODIFY COLUMN `tankType` ENUM('superior', 'inferior') NOT NULL;


-- -------------------------------------------------------------
-- VALIDAÇÃO FINAL — Rodar após cada bloco ou ao final
-- Esperado: todos os COUNTs e resultados sem erro
-- -------------------------------------------------------------

-- Unique indexes criados?
SELECT INDEX_NAME, TABLE_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'd5ea2e96_tst'
  AND INDEX_NAME IN (
    'budgets_budgetNumber_unique',
    'budgets_approvalToken_unique',
    'technicians_username_unique',
    'waterTankSensors_deviceId_unique'
  )
ORDER BY TABLE_NAME, INDEX_NAME;
-- Esperado: 4 linhas

-- Tipos corretos?
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'd5ea2e96_tst'
  AND (
    (TABLE_NAME = 'budgets'           AND COLUMN_NAME = 'sharedWithPortal') OR
    (TABLE_NAME = 'workOrders'        AND COLUMN_NAME = 'technicianSignature') OR
    (TABLE_NAME = 'cashTransactions'  AND COLUMN_NAME IN ('type', 'amount')) OR
    (TABLE_NAME = 'saleItems'         AND COLUMN_NAME IN ('productName', 'unitPrice', 'subtotal')) OR
    (TABLE_NAME = 'sales'             AND COLUMN_NAME = 'total') OR
    (TABLE_NAME = 'waterTankAlertLog' AND COLUMN_NAME IN ('direction', 'tankType'))
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Esperado: IS_NULLABLE = 'NO' para itens 7-14
--           COLUMN_TYPE = 'int' para sharedWithPortal
--           COLUMN_TYPE = 'text' para technicianSignature
