CREATE TABLE `workOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`clientId` int NOT NULL,
	`osNumber` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`serviceType` varchar(100),
	`status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`priority` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`scheduledDate` timestamp,
	`completedDate` timestamp,
	`estimatedHours` int,
	`actualHours` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `workOrders_osNumber_unique` UNIQUE(`osNumber`)
);
