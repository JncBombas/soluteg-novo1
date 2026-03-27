ALTER TABLE workOrderAttachments ADD COLUMN description TEXT NULL AFTER uploadedBy;
ALTER TABLE clients ADD COLUMN syndic_name VARCHAR(255) NULL AFTER address;