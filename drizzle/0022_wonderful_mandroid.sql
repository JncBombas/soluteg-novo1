ALTER TABLE `workOrders` ADD `collaboratorSignature` text;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `collaboratorName` varchar(255);--> statement-breakpoint
ALTER TABLE `workOrders` ADD `clientSignature` text;--> statement-breakpoint
ALTER TABLE `workOrders` ADD `clientName` varchar(255);--> statement-breakpoint
ALTER TABLE `workOrders` ADD `signedAt` timestamp;