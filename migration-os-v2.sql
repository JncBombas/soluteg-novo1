-- Migração do Sistema de OS v2.0
-- Criação de tabelas auxiliares

-- 1. Tabela de Tarefas/Checklist
CREATE TABLE IF NOT EXISTS workOrderTasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  isCompleted INT DEFAULT 0 NOT NULL,
  completedAt TIMESTAMP NULL,
  completedBy VARCHAR(100),
  orderIndex INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_workOrderId (workOrderId),
  FOREIGN KEY (workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
);

-- 2. Tabela de Materiais/Peças
CREATE TABLE IF NOT EXISTS workOrderMaterials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId INT NOT NULL,
  materialName VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit VARCHAR(20),
  unitCost INT,
  totalCost INT,
  addedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  addedBy VARCHAR(100),
  INDEX idx_workOrderId (workOrderId),
  FOREIGN KEY (workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
);

-- 3. Tabela de Anexos
CREATE TABLE IF NOT EXISTS workOrderAttachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId INT NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileKey TEXT NOT NULL,
  fileUrl TEXT NOT NULL,
  fileType VARCHAR(100),
  fileSize INT,
  category ENUM('before', 'during', 'after', 'document', 'other') DEFAULT 'other' NOT NULL,
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  uploadedBy VARCHAR(100),
  INDEX idx_workOrderId (workOrderId),
  FOREIGN KEY (workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
);

-- 4. Tabela de Comentários
CREATE TABLE IF NOT EXISTS workOrderComments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId INT NOT NULL,
  userId VARCHAR(100) NOT NULL,
  userType ENUM('admin', 'client') NOT NULL,
  comment TEXT NOT NULL,
  isInternal INT DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_workOrderId (workOrderId),
  FOREIGN KEY (workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
);

-- 5. Tabela de Rastreamento de Tempo
CREATE TABLE IF NOT EXISTS workOrderTimeTracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workOrderId INT NOT NULL,
  userId VARCHAR(100) NOT NULL,
  startedAt TIMESTAMP NOT NULL,
  endedAt TIMESTAMP NULL,
  durationMinutes INT,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_workOrderId (workOrderId),
  FOREIGN KEY (workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
);
