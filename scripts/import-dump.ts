/**
 * Importa dump SQL do TiDB Cloud para o MySQL principal.
 *
 * Uso:
 *   npx tsx scripts/import-dump.ts <caminho-do-dump.sql>
 *
 * Exemplo:
 *   npx tsx scripts/import-dump.ts dump-cnTZpgYyp8GrFSbA8m5uDU-202604142128.sql
 *
 * O que importa: cashTransactions, categories, customers, products, sales, saleItems
 * O que ignora:  users, __drizzle_migrations, DROP TABLE, CREATE TABLE
 */

import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

// Tabelas PDV que queremos importar
const IMPORT_TABLES = new Set([
  "categories",
  "customers",
  "products",
  "sales",
  "saleItems",
  "cashTransactions",
]);

// Colunas que existem no dump do TiDB (sem costPrice e unit que adicionamos depois)
// Ordem do TiDB: id, barcode, name, description, price, stock, minStock, categoryId, imageUrl, imageKey, createdAt, updatedAt, active
const PRODUCTS_COLS =
  "`id`,`barcode`,`name`,`description`,`price`,`stock`,`minStock`,`categoryId`,`imageUrl`,`imageKey`,`createdAt`,`updatedAt`,`active`";

async function main() {
  const dumpFile = process.argv[2];
  if (!dumpFile) {
    console.error("❌ Informe o caminho do arquivo SQL:");
    console.error(
      "   npx tsx scripts/import-dump.ts dump-cnTZpgYyp8GrFSbA8m5uDU-202604142128.sql"
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL não definida");
    process.exit(1);
  }

  console.log(`📂 Lendo arquivo: ${dumpFile}`);
  const dump = readFileSync(dumpFile, "utf-8");

  console.log("🔌 Conectando ao MySQL...");
  const conn = await createConnection(url);

  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.query("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO'");

  // Divide o dump em blocos separados por ";\n" ou ";\r\n"
  const blocks = dump.split(/;\s*[\r\n]+/);
  const counts: Record<string, number> = {};

  for (const block of blocks) {
    const stmt = block.trim();
    if (!stmt) continue;

    // Só nos interessa linhas de INSERT
    const m = stmt.match(/^INSERT\s+INTO\s+`(\w+)`\s+VALUES/i);
    if (!m) continue;

    const table = m[1];
    if (!IMPORT_TABLES.has(table)) continue;

    // Monta o SQL final
    let sql = stmt
      // Troca INSERT INTO por INSERT IGNORE INTO
      .replace(/^INSERT\s+INTO\s+`/i, "INSERT IGNORE INTO `");

    // Para products: adiciona lista explícita de colunas (TiDB não tinha costPrice/unit)
    if (table === "products") {
      sql = sql.replace(
        /INSERT IGNORE INTO `products` VALUES/i,
        `INSERT IGNORE INTO \`products\` (${PRODUCTS_COLS}) VALUES`
      );
    }

    try {
      const [result] = await conn.query(sql) as any;
      const affected = result.affectedRows ?? 0;
      counts[table] = (counts[table] ?? 0) + affected;
      console.log(`  ✅ ${table}: ${affected} linha(s) inseridas`);
    } catch (err: any) {
      console.error(`  ❌ ${table}: ${err.message}`);
    }
  }

  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  await conn.end();

  console.log("\n🎉 Importação concluída!");
  console.log("   Resumo:");
  for (const [t, n] of Object.entries(counts)) {
    console.log(`   - ${t}: ${n} registros`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
