import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getAdminByEmail, updateAdminLastLogin } from './db';
import { ENV } from './_core/env';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Alias para comparePassword
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(adminId: number): string {
  return jwt.sign(
    { adminId, type: 'admin' },
    ENV.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { adminId: number; type: string } | null {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as { adminId: number; type: string };
    if (decoded.type !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function authenticateAdmin(email: string, password: string) {
  const admin = await getAdminByEmail(email);
  
  if (!admin || !admin.active) {
    throw new Error('Admin não encontrado ou inativo');
  }

  const isPasswordValid = await verifyPassword(password, admin.password);
  
  if (!isPasswordValid) {
    throw new Error('Senha incorreta');
  }

  // Atualizar último login
  await updateAdminLastLogin(admin.id);

  const token = generateToken(admin.id);
  
  return {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      customLabel: admin.customLabel,
    },
    token,
  };
}
