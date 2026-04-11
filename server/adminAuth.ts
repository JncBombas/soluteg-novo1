/**
 * adminAuth.ts
 *
 * Este arquivo contém as funções de autenticação do admin.
 * É aqui que ficam as regras de segurança: como senhas são protegidas,
 * como tokens de sessão são gerados e verificados, e como o login funciona.
 *
 * Conceito importante: NUNCA salvamos senhas em texto puro no banco.
 * Em vez disso, transformamos a senha em um "hash" (uma string embaralhada
 * e irreversível), e na hora de verificar comparamos os hashes.
 */

// bcrypt é a biblioteca padrão para criar hashes seguros de senha
// Ela é propositalmente lenta para dificultar ataques de força bruta
import bcrypt from 'bcrypt';

// jsonwebtoken (jwt) gera e verifica tokens de autenticação
// Um JWT é uma string codificada que carrega informações do usuário de forma segura
import jwt from 'jsonwebtoken';

// Funções do banco de dados usadas para buscar e atualizar dados do admin
import { getAdminByEmail, getAdminByUsername, updateAdminLastLogin } from './db';

// ENV contém variáveis de ambiente como o segredo JWT (lido do arquivo .env)
import { ENV } from './_core/env';

// ──────────────────────────────────────────────
// CONFIGURAÇÃO
// SALT_ROUNDS define o "custo" do hash do bcrypt.
// Quanto maior o número, mais seguro porém mais lento.
// 10 é o valor recomendado para a maioria dos casos.
// ──────────────────────────────────────────────
const SALT_ROUNDS = 10;


// ──────────────────────────────────────────────
// HASH DE SENHA
// Transforma a senha em texto puro em um hash seguro.
// Ex: "minha123" → "$2b$10$eImiTXuWVxfM37uY4JANjQ..."
// Esse processo é irreversível — não dá para "desembaralhar" de volta.
// ──────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}


// ──────────────────────────────────────────────
// VERIFICAR SENHA
// Compara uma senha em texto puro com um hash salvo no banco.
// bcrypt.compare recria o processo de hash com o mesmo salt e compara internamente.
// Retorna true se a senha bater, false caso contrário.
// ──────────────────────────────────────────────
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}


// ──────────────────────────────────────────────
// COMPARAR SENHA (alias)
// Funciona exatamente igual ao verifyPassword.
// Existe como alias para manter compatibilidade com código mais antigo
// que chama pelo nome comparePassword.
// ──────────────────────────────────────────────
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}


// ──────────────────────────────────────────────
// GERAR TOKEN JWT
// Cria um token de sessão assinado digitalmente para o admin.
//
// O token contém:
//   - adminId: o ID do admin no banco de dados
//   - type: "admin" (para distinguir de outros tipos de usuário)
//
// O token é assinado com ENV.jwtSecret (uma chave secreta do servidor)
// e expira automaticamente em 7 dias.
//
// Estrutura de um JWT: header.payload.signature (separados por ponto)
// O payload pode ser lido por qualquer um, mas só o servidor pode assinar/validar.
// ──────────────────────────────────────────────
export function generateToken(adminId: number): string {
  return jwt.sign(
    { adminId, type: 'admin' }, // dados embutidos no token (payload)
    ENV.jwtSecret,              // chave secreta usada para assinar
    { expiresIn: '7d' }         // tempo de expiração: 7 dias
  );
}


// ──────────────────────────────────────────────
// VERIFICAR TOKEN JWT
// Valida se um token recebido (do cookie ou header) é legítimo.
//
// Retorna os dados do admin se o token for válido,
// ou null se o token for inválido, expirado ou não for do tipo "admin".
// ──────────────────────────────────────────────
export function verifyToken(token: string): { adminId: number; type: string } | null {
  try {
    // jwt.verify lança uma exceção se o token for inválido ou expirado
    const decoded = jwt.verify(token, ENV.jwtSecret) as { adminId: number; type: string };

    // Garante que o token é especificamente de um admin (não de outro tipo de usuário)
    if (decoded.type !== 'admin') return null;

    return decoded;
  } catch {
    // Qualquer erro (token adulterado, expirado, mal formado) retorna null
    return null;
  }
}


// ──────────────────────────────────────────────
// TOKEN JWT PARA CLIENTE
// ──────────────────────────────────────────────
export function generateClientToken(clientId: number): string {
  return jwt.sign(
    { clientId, type: 'client' },
    ENV.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function verifyClientToken(token: string): { clientId: number; type: string } | null {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as { clientId: number; type: string };
    if (decoded.type !== 'client') return null;
    return decoded;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// TOKEN JWT PARA TÉCNICO
// ──────────────────────────────────────────────
export function generateTechnicianToken(technicianId: number): string {
  return jwt.sign(
    { technicianId, type: 'technician' },
    ENV.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function verifyTechnicianToken(token: string): { technicianId: number; type: string } | null {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as { technicianId: number; type: string };
    if (decoded.type !== 'technician') return null;
    return decoded;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// AUTENTICAR ADMIN (função principal de login)
// Orquestra todo o processo de login:
//   1. Busca o admin pelo nome de usuário
//   2. Verifica se está ativo
//   3. Confere a senha
//   4. Registra o horário do último login
//   5. Gera e retorna um token JWT junto com os dados básicos do admin
// ──────────────────────────────────────────────
export async function authenticateAdmin(username: string, password: string) {
  // Busca o admin no banco pelo nome de usuário
  const admin = await getAdminByUsername(username);

  // Se não existir ou estiver desativado, rejeita o login
  if (!admin || !admin.active) {
    throw new Error('Admin não encontrado ou inativo');
  }

  // Suporta senhas em texto puro (legado) e hasheadas com bcrypt
  const isBcryptHash = admin.password.startsWith("$2b$") || admin.password.startsWith("$2a$");
  const isPasswordValid = isBcryptHash
    ? await verifyPassword(password, admin.password)
    : password === admin.password;

  if (!isPasswordValid) {
    throw new Error('Senha incorreta');
  }

  // Atualiza o campo "último login" do admin no banco (útil para auditoria)
  await updateAdminLastLogin(admin.id);

  // Gera o token JWT que será enviado ao navegador como cookie
  const token = generateToken(admin.id);

  // Retorna os dados públicos do admin (sem a senha!) e o token
  return {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      customLabel: admin.customLabel, // apelido customizado do admin na interface
    },
    token,
  };
}
