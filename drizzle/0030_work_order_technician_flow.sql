-- Adicionar status "pausada" ao enum de status das OS
ALTER TABLE workOrders
  MODIFY COLUMN status ENUM(
    'aberta',
    'aguardando_aprovacao',
    'aprovada',
    'rejeitada',
    'em_andamento',
    'pausada',
    'concluida',
    'aguardando_pagamento',
    'cancelada'
  ) NOT NULL DEFAULT 'aberta';

-- Assinatura antecipada do técnico (antes de finalizar)
ALTER TABLE workOrders
  ADD COLUMN technicianSignature LONGTEXT NULL,
  ADD COLUMN technicianSignedAt TIMESTAMP NULL;

-- Controle de pausa
ALTER TABLE workOrders
  ADD COLUMN pausedAt TIMESTAMP NULL;
