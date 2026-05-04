-- Migration 0039: Melhorias no sistema de alarmes de caixa d'água
-- Data: 2026-05-04
--
-- 1. waterTankSensors: adiciona campo para habilitar/desabilitar alarme de boia alta por sensor
-- 2. waterTankAlertLog: adiciona rastreamento de entrega (delivered, deliveryError, osId)

-- Habilita/desabilita o alarme de nível alto (boia) individualmente por sensor
ALTER TABLE waterTankSensors
  ADD COLUMN alarm3BoiaEnabled TINYINT NOT NULL DEFAULT 1
    COMMENT '1 = alarme de boia alta habilitado, 0 = desabilitado';

-- Indica se o WhatsApp/email foi entregue com sucesso
ALTER TABLE waterTankAlertLog
  ADD COLUMN delivered TINYINT NOT NULL DEFAULT 0
    COMMENT '0 = pendente/falhou, 1 = entregue com sucesso';

-- Mensagem de erro caso a entrega tenha falhado
ALTER TABLE waterTankAlertLog
  ADD COLUMN deliveryError TEXT NULL
    COMMENT 'Mensagem de erro do WhatsApp/email em caso de falha';

-- ID da OS criada automaticamente (somente para alarm2)
ALTER TABLE waterTankAlertLog
  ADD COLUMN osId INT NULL
    COMMENT 'ID da OS emergencial criada automaticamente pelo alarm2';
