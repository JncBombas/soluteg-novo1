# Pendências para Deploy em Produção — Multi-tenant

**Gerado em:** 2026-05-13  
**Contexto:** Durante a Fase 3.7.1a (multi-tenant), o diagnóstico do staging revelou
14 diferenças entre o banco de produção e o `schema.ts` atual. Todas foram validadas
como seguras no staging, mas **produção tem volumes maiores e deve ser validada
separadamente antes do deploy**.

> ⚠️ **NÃO executar os ALTER TABLE abaixo sem rodar as queries de pré-validação.**  
> Em produção há dados reais de clientes. Um ALTER que falha pode bloquear a tabela.

---

## Checklist de pré-deploy (rodar em produção antes do ALTER)

### PRÉ-VALIDAÇÃO 1 — Unique constraints

Verifica se os dados de produção têm duplicatas que impediriam a criação das constraints.
Se qualquer query retornar > 0, a constraint NÃO pode ser aplicada antes de corrigir os dados.

```sql
-- Duplicatas em budgets.budgetNumber?
SELECT budgetNumber, COUNT(*) AS total
FROM budgets
GROUP BY budgetNumber
HAVING COUNT(*) > 1;
-- Esperado: 0 linhas

-- Duplicatas em budgets.approvalToken?
SELECT approvalToken, COUNT(*) AS total
FROM budgets
WHERE approvalToken IS NOT NULL
GROUP BY approvalToken
HAVING COUNT(*) > 1;
-- Esperado: 0 linhas

-- Duplicatas em technicians.username?
SELECT username, COUNT(*) AS total
FROM technicians
GROUP BY username
HAVING COUNT(*) > 1;
-- Esperado: 0 linhas

-- Duplicatas em waterTankSensors.deviceId?
SELECT deviceId, COUNT(*) AS total
FROM waterTankSensors
GROUP BY deviceId
HAVING COUNT(*) > 1;
-- Esperado: 0 linhas
```

### PRÉ-VALIDAÇÃO 2 — Colunas que receberão NOT NULL

Verifica NULLs que impediriam o MODIFY COLUMN. Se qualquer valor for > 0,
é necessário um UPDATE para preencher os NULLs antes do ALTER.

```sql
SELECT
  (SELECT COUNT(*) FROM cashTransactions WHERE `type` IS NULL)    AS ct_type_nulos,
  (SELECT COUNT(*) FROM cashTransactions WHERE amount IS NULL)     AS ct_amount_nulos,
  (SELECT COUNT(*) FROM saleItems WHERE productName IS NULL)       AS si_nome_nulos,
  (SELECT COUNT(*) FROM saleItems WHERE unitPrice IS NULL)         AS si_preco_nulos,
  (SELECT COUNT(*) FROM saleItems WHERE subtotal IS NULL)          AS si_subtotal_nulos,
  (SELECT COUNT(*) FROM sales WHERE total IS NULL)                 AS sales_total_nulos;
-- Esperado: todos 0
```

### PRÉ-VALIDAÇÃO 3 — Tamanho das assinaturas digitais

Verifica se alguma assinatura ultrapassa o limite do tipo `text` (65.535 bytes).
No staging o maior valor é 38 KB. Em produção pode ter valores maiores.

```sql
SELECT
  COUNT(*)                                                               AS total_assinaturas,
  MAX(LENGTH(technicianSignature))                                       AS maior_bytes,
  SUM(CASE WHEN LENGTH(technicianSignature) > 65535 THEN 1 ELSE 0 END)  AS acima_do_limite
FROM workOrders
WHERE technicianSignature IS NOT NULL;
-- Se acima_do_limite > 0: NÃO aplicar mudança #6. Manter longtext no schema.
```

---

## As 14 mudanças a aplicar em produção

Após as pré-validações passarem, executar o script abaixo em produção
(banco `d5ea2e96_solutegdb`).

> **Recomendação:** executar fora do horário de pico (madrugada).
> Os ALTERs são rápidos (< 1 segundo cada), mas bloqueiam a tabela momentaneamente.

```sql
-- =============================================================
-- BLOCO 1 — Constraints UNIQUE (4)
-- Pré-requisito: PRÉ-VALIDAÇÃO 1 passou (zero duplicatas)
-- =============================================================

ALTER TABLE `budgets`
  ADD UNIQUE INDEX `budgets_budgetNumber_unique` (`budgetNumber`);

ALTER TABLE `budgets`
  ADD UNIQUE INDEX `budgets_approvalToken_unique` (`approvalToken`);

ALTER TABLE `technicians`
  ADD UNIQUE INDEX `technicians_username_unique` (`username`);

ALTER TABLE `waterTankSensors`
  ADD UNIQUE INDEX `waterTankSensors_deviceId_unique` (`deviceId`);


-- =============================================================
-- BLOCO 2 — Mudanças de tipo (2)
-- Pré-requisito: PRÉ-VALIDAÇÃO 3 passou (acima_do_limite = 0)
-- =============================================================

ALTER TABLE `budgets`
  MODIFY COLUMN `sharedWithPortal` INT NOT NULL DEFAULT 0;

ALTER TABLE `workOrders`
  MODIFY COLUMN `technicianSignature` TEXT;


-- =============================================================
-- BLOCO 3 — NOT NULL (6)
-- Pré-requisito: PRÉ-VALIDAÇÃO 2 passou (todos 0)
-- =============================================================

ALTER TABLE `cashTransactions`
  MODIFY COLUMN `type` ENUM('entrada', 'saida') NOT NULL;

ALTER TABLE `cashTransactions`
  MODIFY COLUMN `amount` DECIMAL(10, 2) NOT NULL;

ALTER TABLE `saleItems`
  MODIFY COLUMN `productName` VARCHAR(255) NOT NULL;

ALTER TABLE `saleItems`
  MODIFY COLUMN `unitPrice` DECIMAL(10, 2) NOT NULL;

ALTER TABLE `saleItems`
  MODIFY COLUMN `subtotal` DECIMAL(10, 2) NOT NULL;

ALTER TABLE `sales`
  MODIFY COLUMN `total` DECIMAL(10, 2) NOT NULL;


-- =============================================================
-- BLOCO 4 — Remover DEFAULT (2)
-- Sem pré-requisito de dados — apenas afeta inserts futuros
-- =============================================================

ALTER TABLE `waterTankAlertLog`
  MODIFY COLUMN `direction` ENUM('down', 'up') NOT NULL;

ALTER TABLE `waterTankAlertLog`
  MODIFY COLUMN `tankType` ENUM('superior', 'inferior') NOT NULL;
```

---

## Validação pós-aplicação em produção

```sql
-- Indexes criados?
SELECT INDEX_NAME, TABLE_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'd5ea2e96_solutegdb'
  AND INDEX_NAME IN (
    'budgets_budgetNumber_unique',
    'budgets_approvalToken_unique',
    'technicians_username_unique',
    'waterTankSensors_deviceId_unique'
  )
ORDER BY TABLE_NAME;
-- Esperado: 4 linhas

-- Tipos e NOT NULL corretos?
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'd5ea2e96_solutegdb'
  AND (
    (TABLE_NAME = 'budgets'           AND COLUMN_NAME = 'sharedWithPortal') OR
    (TABLE_NAME = 'workOrders'        AND COLUMN_NAME = 'technicianSignature') OR
    (TABLE_NAME = 'cashTransactions'  AND COLUMN_NAME IN ('type', 'amount')) OR
    (TABLE_NAME = 'saleItems'         AND COLUMN_NAME IN ('productName', 'unitPrice', 'subtotal')) OR
    (TABLE_NAME = 'sales'             AND COLUMN_NAME = 'total') OR
    (TABLE_NAME = 'waterTankAlertLog' AND COLUMN_NAME IN ('direction', 'tankType'))
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
-- Esperado: IS_NULLABLE = 'NO' em todos os 10 itens dos blocos 2-4
```

---

## Status

| Mudança | Staging | Produção |
|---------|---------|----------|
| budgets_budgetNumber_unique | ✅ Aplicado | ⏳ Pendente |
| budgets_approvalToken_unique | ✅ Aplicado | ⏳ Pendente |
| technicians_username_unique | ✅ Aplicado | ⏳ Pendente |
| waterTankSensors_deviceId_unique | ✅ Aplicado | ⏳ Pendente |
| budgets.sharedWithPortal int | ✅ Aplicado | ⏳ Pendente |
| workOrders.technicianSignature text | ✅ Aplicado | ⏳ Pendente |
| cashTransactions.type NOT NULL | ✅ Aplicado | ⏳ Pendente |
| cashTransactions.amount NOT NULL | ✅ Aplicado | ⏳ Pendente |
| saleItems.productName NOT NULL | ✅ Aplicado | ⏳ Pendente |
| saleItems.unitPrice NOT NULL | ✅ Aplicado | ⏳ Pendente |
| saleItems.subtotal NOT NULL | ✅ Aplicado | ⏳ Pendente |
| sales.total NOT NULL | ✅ Aplicado | ⏳ Pendente |
| waterTankAlertLog.direction sem DEFAULT | ✅ Aplicado | ⏳ Pendente |
| waterTankAlertLog.tankType sem DEFAULT | ✅ Aplicado | ⏳ Pendente |
