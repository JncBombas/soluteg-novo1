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
