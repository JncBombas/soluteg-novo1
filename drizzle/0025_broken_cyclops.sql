CREATE TABLE `budgetHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`changedBy` varchar(100) NOT NULL,
	`changedByType` enum('admin','client') NOT NULL,
	`action` varchar(50) NOT NULL,
	`previousStatus` varchar(50),
	`newStatus` varchar(50),
	`snapshotData` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budgetHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgetItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(30) DEFAULT 'un',
	`unitPrice` int NOT NULL DEFAULT 0,
	`totalPrice` int NOT NULL DEFAULT 0,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budgetItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`clientId` int NOT NULL,
	`budgetNumber` varchar(50) NOT NULL,
	`serviceType` enum('instalacao','manutencao','corretiva','preventiva','rotina','emergencial') NOT NULL,
	`priority` enum('normal','alta','critica') NOT NULL DEFAULT 'normal',
	`title` varchar(255) NOT NULL,
	`description` text,
	`scope` text,
	`status` enum('pendente','finalizado','aprovado','reprovado') NOT NULL DEFAULT 'pendente',
	`validityDays` int NOT NULL DEFAULT 30,
	`validUntil` timestamp,
	`laborValue` int,
	`totalValue` int,
	`technicianSignature` text,
	`technicianName` varchar(255),
	`technicianDocument` varchar(20),
	`finalizedAt` timestamp,
	`clientSignature` text,
	`clientSignatureName` varchar(255),
	`approvedAt` timestamp,
	`approvedBy` varchar(100),
	`approvalToken` varchar(64),
	`approvalTokenExpiresAt` timestamp,
	`generatedOsId` int,
	`version` int NOT NULL DEFAULT 1,
	`sharedWithPortal` int NOT NULL DEFAULT 0,
	`internalNotes` text,
	`clientNotes` text,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `budgets_budgetNumber_unique` UNIQUE(`budgetNumber`),
	CONSTRAINT `budgets_approvalToken_unique` UNIQUE(`approvalToken`)
);
--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`username` varchar(100) NOT NULL,
	`password` varchar(255) NOT NULL,
	`cpf` varchar(20),
	`phone` varchar(20),
	`specialization` varchar(150),
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLogin` timestamp,
	CONSTRAINT `technicians_id` PRIMARY KEY(`id`),
	CONSTRAINT `technicians_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `waterTankSensors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`adminId` int NOT NULL,
	`tankName` varchar(100) NOT NULL,
	`capacity` int,
	`notes` text,
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waterTankSensors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workOrderHistory` MODIFY COLUMN `changedByType` enum('admin','client','technician') NOT NULL;--> statement-breakpoint
ALTER TABLE `workOrders` MODIFY COLUMN `type` enum('rotina','emergencial','instalacao','manutencao','corretiva','preventiva') NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `profilePhoto` varchar(500);--> statement-breakpoint
ALTER TABLE `workOrders` ADD `technicianId` int;