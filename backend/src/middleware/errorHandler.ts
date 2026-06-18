import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Operational errors — safe to send to client
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      message: 'Validation error',
      errors: err.errors.map((e: any) => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ message: 'Invalid token' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ message: 'Token expired' });

  // Unknown — don't leak internals
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'An unexpected error occurred' });
};