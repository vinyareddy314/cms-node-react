import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { ApiError } from '../types';
import { signAccessToken } from './jwt';
import { requireAuth } from './middleware';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'email and password are required'
      });
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new ApiError({ status: 401, code: 'unauthorized', message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new ApiError({ status: 401, code: 'unauthorized', message: 'Invalid credentials' });
    }

    const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    res.json({
      access_token: token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});


