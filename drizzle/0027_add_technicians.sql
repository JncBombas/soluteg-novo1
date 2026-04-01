-- Tabela de técnicos
CREATE TABLE technicians (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  adminId        INT NOT NULL,
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(320),
  username       VARCHAR(100) NOT NULL UNIQUE,
  password       VARCHAR(255) NOT NULL,
  cpf            VARCHAR(20),
  phone          VARCHAR(20),
  specialization VARCHAR(150),
  active         INT NOT NULL DEFAULT 1,
  createdAt      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastLogin      TIMESTAMP NULL
);

-- Vincular técnico à OS
ALTER TABLE workOrders ADD COLUMN technicianId INT NULL;

-- Estender enum de changedByType para incluir técnico
ALTER TABLE workOrderHistory
  MODIFY COLUMN changedByType ENUM('admin','client','technician') NOT NULL;
