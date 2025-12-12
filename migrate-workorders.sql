-- Migração manual para atualizar tabela workOrders

-- 1. Renomear tabela antiga
RENAME TABLE workOrders TO workOrders_old;

-- 2. Criar nova tabela com estrutura completa
CREATE TABLE workOrders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  adminId INT NOT NULL,
  clientId INT NOT NULL,
  osNumber VARCHAR(50) NOT NULL UNIQUE,
  
  -- Tipo e categoria
  type ENUM('rotina', 'emergencial', 'orcamento') NOT NULL,
  priority ENUM('normal', 'alta', 'critica') NOT NULL DEFAULT 'normal',
  
  -- Informações básicas
  title VARCHAR(255) NOT NULL,
  description TEXT,
  serviceType VARCHAR(100),
  
  -- Status
  status ENUM(
    'aberta',
    'aguardando_aprovacao',
    'aprovada',
    'rejeitada',
    'em_andamento',
    'concluida',
    'aguardando_pagamento',
    'cancelada'
  ) NOT NULL DEFAULT 'aberta',
  
  -- Datas e tempo
  scheduledDate TIMESTAMP NULL,
  startedAt TIMESTAMP NULL,
  completedAt TIMESTAMP NULL,
  estimatedHours INT,
  actualHours INT,
  
  -- Orçamento
  estimatedValue INT,
  finalValue INT,
  approvedBy VARCHAR(100),
  approvedAt TIMESTAMP NULL,
  
  -- Recorrência
  isRecurring INT NOT NULL DEFAULT 0,
  recurrenceType ENUM('mensal_fixo', 'mensal_inicio'),
  recurrenceDay INT,
  recurrenceCanceled INT NOT NULL DEFAULT 0,
  parentOsId INT,
  
  -- Observações e anexos
  internalNotes TEXT,
  clientNotes TEXT,
  cancellationReason TEXT,
  attachments TEXT,
  
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Migrar dados existentes
INSERT INTO workOrders (
  id, adminId, clientId, osNumber, type, priority, title, description,
  serviceType, status, scheduledDate, completedAt, estimatedHours,
  actualHours, createdAt, updatedAt
)
SELECT 
  id, adminId, clientId, osNumber,
  'emergencial' as type,  -- Assumir emergencial para OS antigas
  CASE 
    WHEN priority = 'baixa' THEN 'normal'
    ELSE priority
  END as priority,
  title, description, serviceType,
  CASE 
    WHEN status = 'aberta' THEN 'aberta'
    WHEN status = 'em_andamento' THEN 'em_andamento'
    WHEN status = 'concluida' THEN 'concluida'
    WHEN status = 'cancelada' THEN 'cancelada'
    ELSE 'aberta'
  END as status,
  scheduledDate, completedDate as completedAt,
  estimatedHours, actualHours, createdAt, updatedAt
FROM workOrders_old;

-- 4. Criar tabela de histórico
CREATE TABLE IF NOT EXISTS workOrderHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId INT NOT NULL,
  changedBy VARCHAR(100) NOT NULL,
  changedByType ENUM('admin', 'client') NOT NULL,
  previousStatus VARCHAR(50),
  newStatus VARCHAR(50) NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Remover tabela antiga (comentado por segurança)
-- DROP TABLE workOrders_old;
