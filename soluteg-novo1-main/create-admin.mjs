import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import "dotenv/config";

const password = '011992';
const email = 'soluteggeradores@gmail.com';
const name = 'Soluteg Admin';
const username = 'admin';

// Hash da senha
const hashedPassword = await bcrypt.hash(password, 10);

console.log('Email:', email);
console.log('Senha hash:', hashedPassword);
console.log('Nome:', name);

// Conexão com banco
const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);

const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: parseInt(url.port || '3306'),
  ssl: { rejectUnauthorized: true }
});

try {
  await connection.execute(
    'INSERT INTO admins (username, email, password, name, active) VALUES (?, ?, ?, ?, 1)',
    [username, email, hashedPassword, name]
  );
  console.log('Admin criado com sucesso!');
} catch (error) {
  console.error('Erro ao criar admin:', error.message);
} finally {
  await connection.end();
}
