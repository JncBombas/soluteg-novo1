CREATE TABLE `normasBiblioteca` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(100) NOT NULL,
	`titulo` text NOT NULL,
	`ano` varchar(10),
	`tiposLaudo` text NOT NULL,
	`ativa` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `normasBiblioteca_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waterTankFaultLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sensorId` int NOT NULL,
	`clientId` int NOT NULL,
	`tankName` varchar(100) NOT NULL,
	`faultType` enum('boia','cebola','bomba','falta_agua','tubulacao','acionamento','fiacao','outro') NOT NULL,
	`description` text,
	`levelAtFault` int NOT NULL,
	`osId` int,
	`registeredBy` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waterTankFaultLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `waterTankAlertLog` MODIFY COLUMN `alertType` enum('alarm1','alarm2','alarm3_boia','sci_reserve','drop_step','filling','level_restored','boia_fault') NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankAlertLog` ADD `direction` enum('down','up') NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankAlertLog` ADD `tankType` enum('superior','inferior') NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankAlertLog` ADD `observation` text;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `tankType` enum('superior','inferior') DEFAULT 'superior' NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `alarm3BoiaPct` int DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE `waterTankSensors` ADD `dropStepPct` int DEFAULT 10 NOT NULL;