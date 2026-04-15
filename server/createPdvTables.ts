/**
 * Script para criar as tabelas do PDV no MySQL caso não existam.
 * Uso: npx tsx server/createPdvTables.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definido no .env");
  process.exit(1);
}

const tables = [
  `CREATE TABLE IF NOT EXISTS \`categories\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(100) NOT NULL,
    \`description\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`categories_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`customers\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`cpfCnpj\` varchar(18),
    \`phone\` varchar(20),
    \`email\` varchar(320),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`customers_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`products\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`barcode\` varchar(13) NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`description\` text,
    \`price\` decimal(10,2) NOT NULL,
    \`costPrice\` decimal(10,2),
    \`unit\` varchar(20) DEFAULT 'un',
    \`stock\` int NOT NULL DEFAULT 0,
    \`minStock\` int NOT NULL DEFAULT 5,
    \`categoryId\` int,
    \`imageUrl\` text,
    \`imageKey\` text,
    \`active\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`products_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`products_barcode_unique\` UNIQUE(\`barcode\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`sales\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`total\` decimal(10,2) NOT NULL,
    \`discount\` decimal(10,2) DEFAULT '0.00',
    \`discountType\` enum('percentage','fixed') DEFAULT 'fixed',
    \`paymentMethod\` enum('dinheiro','cartao_debito','cartao_credito','pix') NOT NULL DEFAULT 'dinheiro',
    \`amountPaid\` decimal(10,2),
    \`change\` decimal(10,2),
    \`customerId\` int,
    \`userId\` int NOT NULL,
    \`canceled\` boolean NOT NULL DEFAULT false,
    \`cancelReason\` text,
    \`canceledAt\` timestamp,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`sales_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`saleItems\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`saleId\` int NOT NULL,
    \`productId\` int NOT NULL,
    \`productName\` varchar(255) NOT NULL,
    \`quantity\` int NOT NULL,
    \`unitPrice\` decimal(10,2) NOT NULL,
    \`subtotal\` decimal(10,2) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`saleItems_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`cashTransactions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`type\` enum('entrada','saida') NOT NULL,
    \`amount\` decimal(10,2) NOT NULL,
    \`description\` text NOT NULL,
    \`saleId\` int,
    \`userId\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`cashTransactions_id\` PRIMARY KEY(\`id\`)
  )`,
];

async function main() {
  const conn = await mysql.createConnection(DB_URL!);
  console.log("Conectado ao banco.");

  for (const sql of tables) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1];
    try {
      await conn.execute(sql);
      console.log(`✅ Tabela '${tableName}' OK`);
    } catch (err: any) {
      console.error(`❌ Erro na tabela '${tableName}':`, err.message);
    }
  }

  await conn.end();
  console.log("Concluído.");
}

main().catch(console.error);
