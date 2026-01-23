CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(64) NOT NULL,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`used` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_email_unique` UNIQUE(`email`),
	CONSTRAINT `invites_code_unique` UNIQUE(`code`)
);
