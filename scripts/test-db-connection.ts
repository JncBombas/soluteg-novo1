import { config } from 'dotenv';
config();
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function main() {
  const dbUrl = process.env.DATABASE_URL!;
  console.log('Conectando em:', dbUrl.replace(/:[^:]+@/, ':***@'));
  const db = drizzle(dbUrl);
  
  // Teste 1: query mais simples possível
  try {
    const r1 = await db.execute(sql`SELECT 1 AS test`);
    console.log('Teste 1 OK:', JSON.stringify(r1));
  } catch (e: any) {
    console.error('Teste 1 FALHOU:', e.message, e.cause);
  }
  
  // Teste 2: sql.raw com query simples
  try {
    const r2 = await db.execute(sql.raw('SELECT 1 AS test'));
    console.log('Teste 2 OK:', JSON.stringify(r2));
  } catch (e: any) {
    console.error('Teste 2 FALHOU:', e.message, e.cause);
  }
  
  // Teste 3: information_schema
  try {
    const r3 = await db.execute(sql.raw(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditLog'"
    ));
    console.log('Teste 3 OK:', JSON.stringify(r3));
  } catch (e: any) {
    console.error('Teste 3 FALHOU:', e.message, e.cause);
  }
  
  process.exit(0);
}

main().catch(console.error);
