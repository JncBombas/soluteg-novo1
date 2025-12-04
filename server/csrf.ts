import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

// Gerar token CSRF
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
};

// Middleware para gerar e validar tokens CSRF
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Para requisições GET, apenas gerar/renovar o token
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    let token = req.cookies[CSRF_COOKIE_NAME];
    if (!token) {
      token = generateCSRFToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Precisa ser acessível pelo JS para enviar no header
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      });
    }
    return next();
  }

  // Para requisições POST, PUT, DELETE, validar o token
  const tokenFromCookie = req.cookies[CSRF_COOKIE_NAME];
  const tokenFromHeader = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string;

  if (!tokenFromCookie || !tokenFromHeader) {
    return res.status(403).json({
      status: "error",
      message: "Token CSRF ausente",
    });
  }

  if (tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({
      status: "error",
      message: "Token CSRF inválido",
    });
  }

  next();
};

// Hook para adicionar token CSRF aos headers das requisições
export const getCSRFToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

// Funcao para fazer requisicoes com CSRF token
export const fetchWithCSRF = async (
  url: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getCSRFToken();
  const headers = {
    ...options.headers,
    [CSRF_HEADER_NAME]: token || "",
  };

  return fetch(url, {
    ...options,
    headers,
  });
};
