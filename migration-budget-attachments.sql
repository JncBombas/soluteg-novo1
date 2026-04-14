-- =====================================================
-- MIGRATION: Anexos de Orçamentos (fotos "antes")
-- Data: 2026-04-14
-- =====================================================

CREATE TABLE IF NOT EXISTS budgetAttachments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  budgetId    INT NOT NULL,
  fileName    VARCHAR(255) NOT NULL,
  fileKey     TEXT NOT NULL,
  fileUrl     TEXT NOT NULL,
  fileType    VARCHAR(100),
  fileSize    INT,
  caption     TEXT,
  uploadedAt  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uploadedBy  VARCHAR(100),
  FOREIGN KEY (budgetId) REFERENCES budgets(id) ON DELETE CASCADE
);
