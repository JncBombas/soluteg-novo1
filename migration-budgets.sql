-- =====================================================
-- MIGRATION: Sistema de Orçamentos (separado das OS)
-- Data: 2026-03-29
-- =====================================================

-- 1. Atualizar enum de tipo das OS (remover 'orcamento', adicionar novos tipos)
ALTER TABLE workOrders
  MODIFY COLUMN type ENUM('rotina', 'emergencial', 'instalacao', 'manutencao', 'corretiva', 'preventiva') NOT NULL;

-- 2. Tabela principal de orçamentos
CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adminId INT NOT NULL,
  clientId INT NOT NULL,
  budgetNumber VARCHAR(50) NOT NULL UNIQUE,           -- ORC-YYYY-NNNN

  -- Tipo de serviço (define o tipo de OS gerada se aprovado)
  serviceType ENUM('instalacao', 'manutencao', 'corretiva', 'preventiva', 'rotina', 'emergencial') NOT NULL,
  priority ENUM('normal', 'alta', 'critica') NOT NULL DEFAULT 'normal',

  -- Informações básicas
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scope TEXT,                                          -- Escopo detalhado

  -- Status do orçamento
  -- pendente   = admin elaborando          | cliente vê "Solicitado"
  -- finalizado = admin finalizou (assinou) | cliente vê "Pendente Aprovação"
  -- aprovado   = aprovado com assinatura   | cliente vê "Aprovado"
  -- reprovado  = reprovado                 | cliente vê "Reprovado"
  status ENUM('pendente', 'finalizado', 'aprovado', 'reprovado') NOT NULL DEFAULT 'pendente',

  -- Validade
  validityDays INT NOT NULL DEFAULT 30,
  validUntil TIMESTAMP NULL,

  -- Valores (em centavos)
  laborValue INT,                                      -- Mão de obra
  totalValue INT,                                      -- Total (materiais + mão de obra)

  -- Assinatura do técnico (ao finalizar)
  technicianSignature TEXT,
  technicianName VARCHAR(255),
  technicianDocument VARCHAR(20),
  finalizedAt TIMESTAMP NULL,

  -- Assinatura do cliente (ao aprovar)
  clientSignature TEXT,
  clientSignatureName VARCHAR(255),
  approvedAt TIMESTAMP NULL,
  approvedBy VARCHAR(100),

  -- Token para aprovação via link público
  approvalToken VARCHAR(64) UNIQUE,
  approvalTokenExpiresAt TIMESTAMP NULL,

  -- Referência à OS gerada quando aprovado
  generatedOsId INT,

  -- Controle de revisões
  version INT NOT NULL DEFAULT 1,

  -- Portal
  sharedWithPortal TINYINT NOT NULL DEFAULT 0,

  -- Notas
  internalNotes TEXT,
  clientNotes TEXT,
  rejectionReason TEXT,

  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Itens de linha do orçamento
CREATE TABLE IF NOT EXISTS budgetItems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  budgetId INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 100,       -- em centésimos (100 = 1,00)
  unit VARCHAR(30) DEFAULT 'un',           -- un, m, m², h, kg, etc
  unitPrice INT NOT NULL DEFAULT 0,        -- em centavos
  totalPrice INT NOT NULL DEFAULT 0,       -- calculado: quantity/100 * unitPrice
  orderIndex INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budgetId) REFERENCES budgets(id) ON DELETE CASCADE
);

-- 4. Histórico de ações no orçamento
CREATE TABLE IF NOT EXISTS budgetHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  budgetId INT NOT NULL,
  changedBy VARCHAR(100) NOT NULL,
  changedByType ENUM('admin', 'client') NOT NULL,
  action VARCHAR(50) NOT NULL,             -- criado, editado, finalizado, aprovado, reprovado, revisao
  previousStatus VARCHAR(50),
  newStatus VARCHAR(50),
  snapshotData TEXT,                       -- JSON com snapshot antes da edição
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budgetId) REFERENCES budgets(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_budgets_adminId ON budgets(adminId);
CREATE INDEX idx_budgets_clientId ON budgets(clientId);
CREATE INDEX idx_budgets_status ON budgets(status);
CREATE INDEX idx_budgets_approvalToken ON budgets(approvalToken);
CREATE INDEX idx_budgetItems_budgetId ON budgetItems(budgetId);
CREATE INDEX idx_budgetHistory_budgetId ON budgetHistory(budgetId);
