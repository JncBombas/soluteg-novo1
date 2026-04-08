CREATE TABLE `waterTankAlertLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensorId` int NOT NULL,
	`clientId` int NOT NULL,
	`tankName` varchar(100) NOT NULL,
	`alertType` enum('alarm1','alarm2','sci_reserve') NOT NULL,
	`triggerPct` int NOT NULL,
	`currentLevel` int NOT NULL,
	`sentTo` varchar(100),
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waterTankAlertLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `deadVolumePct` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `alarm1Pct` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `alarm2Pct` int DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `alertPhone` varchar(30);