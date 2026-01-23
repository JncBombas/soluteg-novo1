CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`profilePhoto` text,
	`customLabel` text,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLogin` timestamp,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_username_unique` UNIQUE(`username`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `checklistInstances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionTaskId` int NOT NULL,
	`templateId` int NOT NULL,
	`customTitle` varchar(255) NOT NULL,
	`brand` varchar(100),
	`power` varchar(50),
	`responses` text,
	`isComplete` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklistInstances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklistTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`description` text,
	`formStructure` text NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklistTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `checklistTemplates_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `clientDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`adminId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`documentType` enum('vistoria','visita','nota_fiscal','servico','relatorio_servico','relatorio_visita') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(50),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`username` varchar(100) NOT NULL,
	`password` varchar(255) NOT NULL,
	`cnpjCpf` varchar(20),
	`phone` varchar(20),
	`address` text,
	`type` enum('com_portal','sem_portal') NOT NULL DEFAULT 'com_portal',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLogin` timestamp,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `inspectionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientAddress` text NOT NULL,
	`inspectionDate` timestamp NOT NULL,
	`recalqueTubulacao` varchar(50),
	`recalqueAcionamento` varchar(50),
	`recalqueBoias` varchar(50),
	`recalqueLimpezaPainel` varchar(50),
	`recalqueLimpezaSala` varchar(50),
	`recalqueTensaoPainel` varchar(50),
	`recalqueCorrenteR` varchar(50),
	`recalqueCorrenteS` varchar(50),
	`recalqueCorrenteT` varchar(50),
	`recalqueRuido` varchar(50),
	`drenoTubulacao` varchar(50),
	`drenoAcionamento` varchar(50),
	`drenoBoias` varchar(50),
	`drenoLimpezaPainel` varchar(50),
	`drenoTensaoPainel` varchar(50),
	`drenoCorrenteL1` varchar(50),
	`drenoCorrenteL2` varchar(50),
	`drenoRuido` varchar(50),
	`piscinaTubulacao` varchar(50),
	`piscinaAcionamento` varchar(50),
	`piscinaBoias` varchar(50),
	`piscinaLimpezaPainel` varchar(50),
	`piscinaTensaoPainel` varchar(50),
	`piscinaCorrenteR` varchar(50),
	`piscinaCorrenteS` varchar(50),
	`piscinaCorrenteT` varchar(50),
	`incendioB1Tubulacao` varchar(50),
	`incendioB1Acionamento` varchar(50),
	`incendioB1LimpezaSala` varchar(50),
	`incendioB1LimpezaPainel` varchar(50),
	`incendioB1TensaoPainel` varchar(50),
	`incendioB1Corrente` varchar(50),
	`incendioB1Ruido` varchar(50),
	`incendioB2Tubulacao` varchar(50),
	`incendioB2Acionamento` varchar(50),
	`incendioB2LimpezaSala` varchar(50),
	`incendioB2LimpezaPainel` varchar(50),
	`incendioB2TensaoPainel` varchar(50),
	`incendioB2Corrente` varchar(50),
	`incendioB2Ruido` varchar(50),
	`observations` text,
	`technicianSignature` text,
	`clientSignature` text,
	`photos` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspectionTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pendente','em_andamento','concluida') NOT NULL DEFAULT 'pendente',
	`collaboratorSignature` text,
	`collaboratorName` varchar(255),
	`collaboratorDocument` varchar(20),
	`clientSignature` text,
	`clientName` varchar(255),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inspectionTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(255) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`used` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_email_unique` UNIQUE(`email`),
	CONSTRAINT `invites_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`serviceType` varchar(100) NOT NULL,
	`serviceDate` timestamp NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`equipmentDetails` text,
	`workPerformed` text NOT NULL,
	`partsUsed` text,
	`technicianName` varchar(255) NOT NULL,
	`observations` text,
	`status` enum('draft','completed','reviewed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrderAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`fileType` varchar(100),
	`fileSize` int,
	`category` enum('before','during','after','document','other') NOT NULL DEFAULT 'other',
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` varchar(100),
	CONSTRAINT `workOrderAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrderComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`userId` varchar(100) NOT NULL,
	`userType` enum('admin','client') NOT NULL,
	`comment` text NOT NULL,
	`isInternal` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workOrderComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrderHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`changedBy` varchar(100) NOT NULL,
	`changedByType` enum('admin','client') NOT NULL,
	`previousStatus` varchar(50),
	`newStatus` varchar(50) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workOrderHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrderMaterials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`materialName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unit` varchar(20),
	`unitCost` int,
	`totalCost` int,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`addedBy` varchar(100),
	CONSTRAINT `workOrderMaterials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrderTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`isCompleted` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`completedBy` varchar(100),
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workOrderTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrderTimeTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workOrderId` int NOT NULL,
	`userId` varchar(100) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`durationMinutes` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workOrderTimeTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`clientId` int NOT NULL,
	`osNumber` varchar(50) NOT NULL,
	`type` enum('rotina','emergencial','orcamento') NOT NULL,
	`priority` enum('normal','alta','critica') NOT NULL DEFAULT 'normal',
	`title` varchar(255) NOT NULL,
	`description` text,
	`serviceType` varchar(100),
	`status` enum('aberta','aguardando_aprovacao','aprovada','rejeitada','em_andamento','concluida','aguardando_pagamento','cancelada') NOT NULL DEFAULT 'aberta',
	`scheduledDate` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`estimatedHours` int,
	`actualHours` int,
	`estimatedValue` int,
	`finalValue` int,
	`approvedBy` varchar(100),
	`approvedAt` timestamp,
	`isRecurring` int NOT NULL DEFAULT 0,
	`recurrenceType` enum('mensal_fixo','mensal_inicio'),
	`recurrenceDay` int,
	`recurrenceCanceled` int NOT NULL DEFAULT 0,
	`parentOsId` int,
	`internalNotes` text,
	`clientNotes` text,
	`cancellationReason` text,
	`attachments` text,
	`collaboratorSignature` text,
	`collaboratorName` varchar(255),
	`clientSignature` text,
	`clientName` varchar(255),
	`signedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `workOrders_osNumber_unique` UNIQUE(`osNumber`)
);
