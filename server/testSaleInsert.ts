/**
 * Testa INSERT na tabela sales e mostra o erro MySQL real.
 * Uso: npx tsx server/testSaleInsert.ts
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("DATABASE_URL não definido"); process.exit(1); }

async function main() {
  const conn = await mysql.createConnection(DB_URL!);

  // Mostra qual banco + host está sendo usado
  const [dbRow] = await conn.execute<mysql.RowDataPacket[]>("SELECT DATABASE() as db, @@hostname as host, @@port as port");
  console.log("Banco conectado:", dbRow[0].db, "| host:", dbRow[0].host, "| port:", dbRow[0].port);
  console.log("DATABASE_URL host:", new URL(DB_URL!).hostname, "| port:", new URL(DB_URL!).port);

  // Mostra FK constraints na tabela sales
  const [fks] = await conn.execute<mysql.RowDataPacket[]>(`
    SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  console.log("\nFK constraints em sales:", fks.length ? fks : "nenhuma");

  // Mostra estrutura real da tabela sales
  const [cols] = await conn.execute<mysql.RowDataPacket[]>(`DESCRIBE sales`);
  console.log("\nEstrutura da tabela sales:");
  for (const c of cols) console.log(` ${c.Field}: ${c.Type} | null=${c.Null} | default=${c.Default}`);

  // Tenta o INSERT exato que o sistema faz
  console.log("\nTestando INSERT...");
  try {
    const [result] = await conn.execute(
      "INSERT INTO `sales` (`total`, `discount`, `discountType`, `paymentMethod`, `userId`) VALUES (?, ?, ?, ?, ?)",
      ["25.00", "0.00", "fixed", "pix", 1]
    );
    console.log("✅ INSERT OK:", result);
    // Apaga o registro de teste
    const insertId = (result as any).insertId;
    await conn.execute("DELETE FROM `sales` WHERE id = ?", [insertId]);
    console.log("🗑  Registro de teste removido.");
  } catch (err: any) {
    console.error("❌ Erro MySQL:", err.message);
    console.error("   Código:", err.code);
    console.error("   sqlMessage:", err.sqlMessage);
  }

  await conn.end();
}

main().catch(console.error);
