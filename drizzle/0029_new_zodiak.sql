CREATE TABLE `configuracoesTecnico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nomeCompleto` varchar(255),
	`registroCrt` varchar(100),
	`especialidade` varchar(150),
	`empresa` varchar(255),
	`cidade` varchar(100),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `configuracoesTecnico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `laudoFotos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laudoId` int NOT NULL,
	`url` text NOT NULL,
	`legenda` text,
	`comentario` text,
	`classificacao` enum('conforme','nao_conforme','atencao'),
	`ordem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `laudoFotos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `laudoMedicoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`laudoId` int NOT NULL,
	`descricao` text NOT NULL,
	`unidade` varchar(30),
	`valorMedido` varchar(100),
	`valorReferencia` varchar(100),
	`resultado` enum('aprovado','reprovado'),
	`ordem` int NOT NULL DEFAULT 0,
	CONSTRAINT `laudoMedicoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `laudos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` varchar(20) NOT NULL,
	`tipo` enum('instalacao_eletrica','inspecao_predial','nr10_nr12','grupo_gerador','adequacoes') NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`clienteId` int,
	`osId` int,
	`status` enum('rascunho','finalizado','enviado') NOT NULL DEFAULT 'rascunho',
	`objeto` text,
	`metodologia` text,
	`equipamentosUtilizados` text,
	`condicoesLocal` text,
	`constatacoes` text,
	`conclusaoParecer` enum('conforme','nao_conforme','parcialmente_conforme'),
	`conclusaoTexto` text,
	`recomendacoes` text,
	`normasReferencia` text,
	`validadeMeses` int NOT NULL DEFAULT 12,
	`dataInspecao` timestamp,
	`criadoPor` int,
	`criadoPorTipo` enum('admin','tecnico'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `laudos_id` PRIMARY KEY(`id`),
	CONSTRAINT `laudos_numero_unique` UNIQUE(`numero`)
);
