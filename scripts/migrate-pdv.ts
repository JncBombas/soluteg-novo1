/**
 * Migração de dados PDV: TiDB Cloud → MySQL principal
 *
 * Uso:
 *   PDV_DATABASE_URL="<tidb_url>" DATABASE_URL="<mysql_url>" npx tsx scripts/migrate-pdv.ts
 *
 * O script:
 *   1. Lê todos os dados das 6 tabelas do PDV no TiDB Cloud
 *   2. Insere no MySQL principal, preservando IDs originais
 *   3. Imprime um resumo ao final
 *
 * ATENÇÃO: Execute ANTES de fazer deploy da versão sem pdvConnection.ts.
 * Certifique-se de que as tabelas PDV já foram criadas no MySQL (pnpm db:push).
 */

import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import {
  categories,
  products,
  sales,
  saleItems,
  cashTransactions,
  customers,
} from "../server/pdvSchema";

async function main() {
  const tidbUrl = process.env.PDV_DATABASE_URL;
  const mysqlUrl = process.env.DATABASE_URL;

  if (!tidbUrl) {
    console.error("❌ PDV_DATABASE_URL não definida");
    process.exit(1);
  }
  if (!mysqlUrl) {
    console.error("❌ DATABASE_URL não definida");
    process.exit(1);
  }

  console.log("🔌 Conectando a TiDB Cloud (fonte)...");
  const tidb = drizzle(tidbUrl);

  console.log("🔌 Conectando a MySQL principal (destino)...");
  const mysql = drizzle(mysqlUrl);

  // ── Leitura ──────────────────────────────────────────────────────────────
  console.log("\n📤 Lendo dados do TiDB Cloud...");
  const [
    allCategories,
    allProducts,
    allSales,
    allSaleItems,
    allCashTransactions,
    allCustomers,
  ] = await Promise.all([
    tidb.select().from(categories),
    tidb.select().from(products),
    tidb.select().from(sales),
    tidb.select().from(saleItems),
    tidb.select().from(cashTransactions),
    tidb.select().from(customers),
  ]);

  console.log(`  categories:       ${allCategories.length}`);
  console.log(`  products:         ${allProducts.length}`);
  console.log(`  sales:            ${allSales.length}`);
  console.log(`  saleItems:        ${allSaleItems.length}`);
  console.log(`  cashTransactions: ${allCashTransactions.length}`);
  console.log(`  customers:        ${allCustomers.length}`);

  // ── Inserção (ordem respeitando FK) ──────────────────────────────────────
  console.log("\n📥 Inserindo no MySQL...");

  async function insertBatch<T extends Record<string, unknown>>(
    label: string,
    rows: T[],
    insertFn: (rows: T[]) => Promise<unknown>
  ) {
    if (rows.length === 0) {
      console.log(`  ✅ ${label}: vazio, pulando`);
      return;
    }
    // Inserir em lotes de 200 para evitar pacotes muito grandes
    const BATCH = 200;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      await insertFn(rows.slice(i, i + BATCH) as T[]);
      inserted += Math.min(BATCH, rows.length - i);
    }
    console.log(`  ✅ ${label}: ${inserted} registros inseridos`);
  }

  // Desabilitar verificações de FK e AUTO_INCREMENT para preservar IDs
  await mysql.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  try {
    await insertBatch("categories", allCategories, (rows) =>
      mysql
        .insert(categories)
        .values(rows as any)
        .onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } })
    );

    await insertBatch("products", allProducts, (rows) =>
      mysql
        .insert(products)
        .values(rows as any)
        .onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } })
    );

    await insertBatch("customers", allCustomers, (rows) =>
      mysql
        .insert(customers)
        .values(rows as any)
        .onDuplicateKeyUpdate({ set: { name: sql`VALUES(name)` } })
    );

    await insertBatch("sales", allSales, (rows) =>
      mysql
        .insert(sales)
        .values(rows as any)
        .onDuplicateKeyUpdate({ set: { total: sql`VALUES(total)` } })
    );

    await insertBatch("saleItems", allSaleItems, (rows) =>
      mysql
        .insert(saleItems)
        .values(rows as any)
        .onDuplicateKeyUpdate({ set: { productName: sql`VALUES(productName)` } })
    );

    await insertBatch("cashTransactions", allCashTransactions, (rows) =>
      mysql
        .insert(cashTransactions)
        .values(rows as any)
        .onDuplicateKeyUpdate({ set: { description: sql`VALUES(description)` } })
    );
  } finally {
    await mysql.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  }

  console.log("\n🎉 Migração concluída com sucesso!");
  console.log("   Próximo passo: faça deploy e remova PDV_DATABASE_URL do .env");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro na migração:", err);
  process.exit(1);
});
