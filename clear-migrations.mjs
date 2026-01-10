import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const conn = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: parseInt(url.port || '3306'),
  ssl: {}
});

try {
  await conn.execute('DELETE FROM __drizzle_migrations');
  console.log('✅ Histórico de migrações limpo');
  
  // Listar tabelas
  const [tables] = await conn.execute('SHOW TABLES');
  console.log('📋 Tabelas existentes:', tables.map(t => Object.values(t)[0]));
} catch (e) {
  console.error('❌ Erro:', e.message);
} finally {
  await conn.end();
}
