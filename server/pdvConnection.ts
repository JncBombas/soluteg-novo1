import { drizzle } from "drizzle-orm/mysql2";

// Conexão dedicada ao banco TiDB Cloud do PDV (separada do MySQL principal)
let _pdvDb: ReturnType<typeof drizzle> | null = null;

export function getPdvDb(): ReturnType<typeof drizzle> {
  if (!_pdvDb) {
    const url = process.env.PDV_DATABASE_URL;
    if (!url) {
      throw new Error("[PDV] PDV_DATABASE_URL não configurada no .env");
    }
    try {
      _pdvDb = drizzle(url);
      console.log("[PDV] Conexão com TiDB Cloud estabelecida.");
    } catch (error) {
      console.error("[PDV] Erro ao conectar ao TiDB Cloud:", error);
      throw error;
    }
  }
  return _pdvDb;
}
