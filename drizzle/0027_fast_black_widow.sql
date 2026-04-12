ALTER TABLE `waterTankSensors` MODIFY COLUMN `clientId` int;--> statement-breakpoint
ALTER TABLE `waterTankSensors` MODIFY COLUMN `adminId` int;--> statement-breakpoint
ALTER TABLE `waterTankSensors` MODIFY COLUMN `tankName` varchar(100);--> statement-breakpoint
ALTER TABLE `workOrders` MODIFY COLUMN `status` enum('aberta','aguardando_aprovacao','aprovada','rejeitada','em_andamento','pausada','concluida','aguardando_pagamento','cancelada') NOT NULL DEFAULT 'aberta';--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `deviceId` varchar(100);--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `distVazia` int;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `distCheia` int;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `lastSeenAt` timestamp;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `technicianSignature` text;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `technicianSignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `pausedAt` timestamp;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD CONSTRAINT `waterTankSensors_deviceId_unique` UNIQUE(`deviceId`);