-- Migration 0029: sensor distance calibration
-- Adds distVazia and distCheia columns to waterTankSensors.
-- Admin configures these in the portal; server converts distance_cm → level_pct.
--
-- Run on VPS:
--   mysql -u USER -p DATABASE < drizzle/0029_sensor_calibration.sql

ALTER TABLE `waterTankSensors`
  ADD COLUMN `distVazia` INT NULL AFTER `alertPhone`,
  ADD COLUMN `distCheia` INT NULL AFTER `distVazia`;
