import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../auth/middleware';

export const cmsTopicsRouter = Router();
cmsTopicsRouter.use(requireAuth);

cmsTopicsRouter.get('/', requireRole(['admin', 'editor', 'viewer']), async (_req, res, next) => {
  try {
    const topics = await db('topics').select('id', 'name').orderBy('name', 'asc');
    res.json({ topics });
  } catch (err) {
    next(err);
  }
});


