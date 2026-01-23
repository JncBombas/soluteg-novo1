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
  // Deletar histórico de migrações
  await conn.execute('DELETE FROM __drizzle_migrations');
  console.log('✅ Histórico de migrações limpo');
  
  // Listar tabelas para deletar (exceto __drizzle_migrations)
  const [tables] = await conn.execute('SHOW TABLES');
  const tablesToDelete = tables
    .map(t => Object.values(t)[0])
    .filter(t => t !== '__drizzle_migrations');
  
  console.log('🗑️  Deletando tabelas:', tablesToDelete);
  
  // Desabilitar foreign key checks
  await conn.execute('SET FOREIGN_KEY_CHECKS=0');
  
  for (const table of tablesToDelete) {
    await conn.execute(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`  ✅ Deletada: ${table}`);
  }
  
  // Reabilitar foreign key checks
  await conn.execute('SET FOREIGN_KEY_CHECKS=1');
  
  console.log('✅ Todas as tabelas foram deletadas');
} catch (e) {
  console.error('❌ Erro:', e.message);
} finally {
  await conn.end();
}
