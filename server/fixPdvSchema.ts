/**
 * Script para adicionar colunas faltantes nas tabelas do PDV.
 * Preserva dados existentes — só adiciona o que falta.
 * Uso: npx tsx server/fixPdvSchema.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não definido no .env");
  process.exit(1);
}

async function columnExists(conn: mysql.Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(
  conn: mysql.Connection,
  table: string,
  column: string,
  definition: string
) {
  const exists = await columnExists(conn, table, column);
  if (exists) {
    console.log(`  ⏭  ${table}.${column} já existe`);
    return;
  }
  await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`  ✅ ${table}.${column} adicionada`);
}

async function main() {
  const conn = await mysql.createConnection(DB_URL!);
  console.log("Conectado ao banco.\n");

  // ── SALES ──────────────────────────────────────────────────────────────────
  console.log("📋 Tabela: sales");
  await addColumnIfMissing(conn, "sales", "discount",     "`discount` decimal(10,2) DEFAULT '0.00'");
  await addColumnIfMissing(conn, "sales", "discountType", "`discountType` enum('percentage','fixed') DEFAULT 'fixed'");
  await addColumnIfMissing(conn, "sales", "amountPaid",   "`amountPaid` decimal(10,2)");
  await addColumnIfMissing(conn, "sales", "change",       "`change` decimal(10,2)");
  await addColumnIfMissing(conn, "sales", "customerId",   "`customerId` int");
  await addColumnIfMissing(conn, "sales", "canceled",     "`canceled` boolean NOT NULL DEFAULT false");
  await addColumnIfMissing(conn, "sales", "cancelReason", "`cancelReason` text");
  await addColumnIfMissing(conn, "sales", "canceledAt",   "`canceledAt` timestamp NULL");

  // ── SALEITEMS ──────────────────────────────────────────────────────────────
  console.log("\n📋 Tabela: saleItems");
  await addColumnIfMissing(conn, "saleItems", "productName", "`productName` varchar(255) NOT NULL DEFAULT ''");
  await addColumnIfMissing(conn, "saleItems", "subtotal",    "`subtotal` decimal(10,2) NOT NULL DEFAULT 0");

  // ── PRODUCTS ───────────────────────────────────────────────────────────────
  console.log("\n📋 Tabela: products");
  await addColumnIfMissing(conn, "products", "costPrice",   "`costPrice` decimal(10,2)");
  await addColumnIfMissing(conn, "products", "unit",        "`unit` varchar(20) DEFAULT 'un'");
  await addColumnIfMissing(conn, "products", "minStock",    "`minStock` int NOT NULL DEFAULT 5");
  await addColumnIfMissing(conn, "products", "imageUrl",    "`imageUrl` text");
  await addColumnIfMissing(conn, "products", "imageKey",    "`imageKey` text");
  await addColumnIfMissing(conn, "products", "active",      "`active` boolean NOT NULL DEFAULT true");
  await addColumnIfMissing(conn, "products", "categoryId",  "`categoryId` int");
  await addColumnIfMissing(conn, "products", "updatedAt",   "`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP");

  await conn.end();
  console.log("\nConcluído.");
}

main().catch(console.error);
