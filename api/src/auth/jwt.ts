import jwt from 'jsonwebtoken';
import { ApiError } from '../types';
import type { UserRole } from '../types';

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

const JWT_SECRET = process.env.JWT_SECRET;

export function signAccessToken(payload: JwtPayload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function verifyAccessToken(token: string): JwtPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const sub = String(decoded.sub || '');
    const email = String((decoded as any).email || '');
    const role = String((decoded as any).role || '') as UserRole;
    if (!sub || !email || !role) {
      throw new ApiError({ status: 401, code: 'unauthorized', message: 'Invalid token' });
    }
    return { sub, email, role };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError({ status: 401, code: 'unauthorized', message: 'Invalid token' });
  }
}


