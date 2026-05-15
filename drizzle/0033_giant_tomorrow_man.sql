CREATE TABLE `condominiums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`gestorId` int,
	`name` varchar(200) NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`units` int,
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `condominiums_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `gestors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(200),
	`whatsapp` varchar(30),
	`username` varchar(100) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` varchar(40) NOT NULL DEFAULT 'sindico',
	`active` tinyint NOT NULL DEFAULT 1,
	`mustResetPassword` tinyint NOT NULL DEFAULT 1,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gestors_id` PRIMARY KEY(`id`),
	CONSTRAINT `gestors_tenantId_username_unique` UNIQUE(`tenantId`,`username`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `notificationContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`condominiumId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`whatsapp` varchar(30) NOT NULL,
	`email` varchar(200),
	`role` varchar(100),
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationContacts_id` PRIMARY KEY(`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `platformAdmins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(200) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`active` tinyint NOT NULL DEFAULT 1,
	`lastLoginAt` timestamp,
	`mustResetPassword` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformAdmins_id` PRIMARY KEY(`id`),
	CONSTRAINT `platformAdmins_email_unique` UNIQUE(`email`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`isPlatformTenant` tinyint NOT NULL DEFAULT 0,
	`logoUrl` varchar(500),
	`primaryColor` varchar(7) NOT NULL DEFAULT '#D4A84B',
	`whatsappNumber` varchar(30),
	`contactEmail` varchar(200),
	`cnpj` varchar(18),
	`address` text,
	`city` varchar(100),
	`state` varchar(2),
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `condominiums` ADD CONSTRAINT `condominiums_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `condominiums` ADD CONSTRAINT `condominiums_gestorId_gestors_id_fk` FOREIGN KEY (`gestorId`) REFERENCES `gestors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gestors` ADD CONSTRAINT `gestors_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notificationContacts` ADD CONSTRAINT `notificationContacts_condominiumId_condominiums_id_fk` FOREIGN KEY (`condominiumId`) REFERENCES `condominiums`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `condominiums_tenantId_idx` ON `condominiums` (`tenantId`);--> statement-breakpoint
CREATE INDEX `condominiums_gestorId_idx` ON `condominiums` (`gestorId`);--> statement-breakpoint
CREATE INDEX `condominiums_tenantId_name_idx` ON `condominiums` (`tenantId`,`name`);--> statement-breakpoint
CREATE INDEX `condominiums_active_idx` ON `condominiums` (`active`);--> statement-breakpoint
CREATE INDEX `gestors_tenantId_idx` ON `gestors` (`tenantId`);--> statement-breakpoint
CREATE INDEX `gestors_active_idx` ON `gestors` (`active`);--> statement-breakpoint
CREATE INDEX `notificationContacts_condominiumId_idx` ON `notificationContacts` (`condominiumId`);--> statement-breakpoint
CREATE INDEX `notificationContacts_active_idx` ON `notificationContacts` (`active`);--> statement-breakpoint
CREATE INDEX `platformAdmins_active_idx` ON `platformAdmins` (`active`);--> statement-breakpoint
CREATE INDEX `tenants_active_idx` ON `tenants` (`active`);