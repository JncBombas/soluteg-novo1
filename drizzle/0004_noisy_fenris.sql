ALTER TABLE `invites` MODIFY COLUMN `used` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invites` MODIFY COLUMN `used` int NOT NULL DEFAULT 0;