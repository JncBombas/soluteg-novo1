import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Log do erro
  console.error("[ERROR]", {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Erro genérico
  res.status(500).json({
    status: "error",
    message: "Erro interno do servidor",
  });
};

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        status: "error",
        message: "Validação falhou",
        errors: validation.error.flatten(),
      });
    }
    req.body = validation.data;
    next();
  };
};
