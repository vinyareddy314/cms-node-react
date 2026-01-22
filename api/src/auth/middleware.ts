import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';
import type { UserRole } from '../types';
import { verifyAccessToken } from './jwt';

export type AuthUser = { id: string; email: string; role: UserRole };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

function getBearerToken(req: Request) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return next(new ApiError({ status: 401, code: 'unauthorized', message: 'Missing bearer token' }));
  }
  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  return next();
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError({ status: 401, code: 'unauthorized', message: 'Not authenticated' }));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError({ status: 403, code: 'forbidden', message: 'Insufficient role' }));
    }
    return next();
  };
}


