-- Migration 0028: sensor auto-discovery
-- Adds deviceId to waterTankSensors, makes clientId/adminId/tankName nullable,
-- adds lastSeenAt for presence tracking.
--
-- Run on VPS:
--   mysql -u USER -p DATABASE < drizzle/0028_sensor_device_id.sql

ALTER TABLE `waterTankSensors`
  ADD COLUMN `deviceId` VARCHAR(100) NULL AFTER `id`,
  ADD COLUMN `lastSeenAt` TIMESTAMP NULL AFTER `active`,
  MODIFY COLUMN `clientId` INT NULL,
  MODIFY COLUMN `adminId` INT NULL,
  MODIFY COLUMN `tankName` VARCHAR(100) NULL;

-- Give existing (legacy) sensors a placeholder deviceId
UPDATE `waterTankSensors` SET `deviceId` = CONCAT('legacy_', `id`) WHERE `deviceId` IS NULL;

-- Add unique index
ALTER TABLE `waterTankSensors` ADD UNIQUE INDEX `idx_wts_deviceId` (`deviceId`);
