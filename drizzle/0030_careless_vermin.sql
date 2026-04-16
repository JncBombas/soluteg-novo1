CREATE TABLE `laudoTecnicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laudoId` int NOT NULL,
	`tecnicoId` int NOT NULL,
	`atribuidoEm` timestamp NOT NULL DEFAULT (now()),
	`atribuidoPor` int,
	CONSTRAINT `laudoTecnicos_id` PRIMARY KEY(`id`),
	CONSTRAINT `laudoTecnicos_laudo_tecnico_unique` UNIQUE(`laudoId`,`tecnicoId`)
);
