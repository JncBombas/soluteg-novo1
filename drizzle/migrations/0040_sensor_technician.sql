-- Migration 0040: Técnico responsável por sensor de caixa d'água
-- Data: 2026-05-04
--
-- Adiciona technicianId em waterTankSensors.
-- Quando alarm2 dispara, o técnico configurado recebe WhatsApp e é
-- atribuído automaticamente à OS emergencial criada.

ALTER TABLE waterTankSensors
  ADD COLUMN technicianId INT NULL
    COMMENT 'Técnico responsável — acionado automaticamente no alarm2';
