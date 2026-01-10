import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const password = '011992';
const email = 'soluteggeradores@gmail.com';
const name = 'Soluteg Admin';

// Hash da senha
const hashedPassword = await bcrypt.hash(password, 10);

console.log('Email:', email);
console.log('Senha hash:', hashedPassword);
console.log('Nome:', name);

// Conexão com banco
const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/')[3] || 'soluteg',
});

try {
  await connection.execute(
    'INSERT INTO admins (email, password, name, active) VALUES (?, ?, ?, 1)',
    [email, hashedPassword, name]
  );
  console.log('Admin criado com sucesso!');
} catch (error) {
  console.error('Erro ao criar admin:', error.message);
} finally {
  await connection.end();
}
