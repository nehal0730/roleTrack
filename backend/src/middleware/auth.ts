import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Role } from '../models';

export interface AuthRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: number;
    email: string;
    role_id: number;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

    const user = await User.findOne({
      where: { id: decoded.id, is_active: true },
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });
    if (!user) return res.status(401).json({ message: 'User not found or inactive' });

    req.user = {
      id:      user.id,
      email:   user.email,
      role_id: user.role_id,
      role:    (user as any).role?.name ?? '',
    };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};