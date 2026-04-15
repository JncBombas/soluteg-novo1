/**
 * Cria as tabelas PDV no MySQL principal usando CREATE TABLE IF NOT EXISTS.
 * Seguro para rodar mesmo que algumas tabelas já existam.
 *
 * Uso:
 *   DATABASE_URL="mysql://user:pass@host:3306/db" npx tsx scripts/create-pdv-tables.ts
 *
 * Ou simplesmente: npx tsx scripts/create-pdv-tables.ts
 * (usa o DATABASE_URL do .env se disponível)
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const statements = [
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
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL não definida");
    process.exit(1);
  }

  console.log("🔌 Conectando ao MySQL...");
  const db = drizzle(url);

  const tableNames = [
    "categories",
    "customers",
    "products",
    "sales",
    "saleItems",
    "cashTransactions",
  ];

  for (let i = 0; i < statements.length; i++) {
    const table = tableNames[i];
    try {
      await db.execute(sql.raw(statements[i]));
      console.log(`  ✅ ${table}: criada (ou já existia)`);
    } catch (err: any) {
      console.error(`  ❌ ${table}: ${err.message}`);
    }
  }

  console.log("\n🎉 Tabelas PDV prontas no MySQL!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
