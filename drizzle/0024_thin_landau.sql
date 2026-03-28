CREATE TABLE `waterTankMonitoring` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`adminId` int NOT NULL,
	`tankName` varchar(100) NOT NULL,
	`currentLevel` int NOT NULL,
	`capacity` int,
	`status` enum('otimo','bom','alerta','critico') NOT NULL DEFAULT 'otimo',
	`notes` text,
	`measuredAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waterTankMonitoring_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clientDocuments` ADD `month` int;--> statement-breakpoint
ALTER TABLE `clientDocuments` ADD `year` int;--> statement-breakpoint
ALTER TABLE `clients` ADD `syndic_name` varchar(255);--> statement-breakpoint
ALTER TABLE `workOrderAttachments` ADD `description` text;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `sharedWithPortal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `portalTab` varchar(50);