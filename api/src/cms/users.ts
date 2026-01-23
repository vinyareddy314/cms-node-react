import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { ApiError } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';

export const cmsUsersRouter = Router();

// Only admins can manage users
cmsUsersRouter.use(requireAuth, requireRole(['admin']));

// List all users
cmsUsersRouter.get('/', async (_req, res, next) => {
    try {
        const users = await db('users')
            .select('id', 'email', 'role', 'created_at')
            .orderBy('created_at', 'desc');
        res.json({ data: users });
    } catch (err) {
        next(err);
    }
});

// Create user
cmsUsersRouter.post('/', async (req, res, next) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            throw new ApiError({
                status: 400,
                code: 'validation_error',
                message: 'Email, password, and role are required'
            });
        }

        if (!['admin', 'editor', 'viewer'].includes(role)) {
            throw new ApiError({
                status: 400,
                code: 'validation_error',
                message: 'Invalid role'
            });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const id = uuid();

        const [user] = await db('users')
            .insert({
                id,
                email,
                password_hash,
                role
            })
            .returning(['id', 'email', 'role', 'created_at']);

        res.status(201).json(user);
    } catch (err) {
        next(err);
    }
});

// Update user
cmsUsersRouter.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, password, role } = req.body;

        const existing = await db('users').where({ id }).first();
        if (!existing) {
            throw new ApiError({ status: 404, code: 'not_found', message: 'User not found' });
        }

        const updates: any = {};
        if (email) updates.email = email;
        if (role) {
            if (!['admin', 'editor', 'viewer'].includes(role)) {
                throw new ApiError({ status: 400, code: 'validation_error', message: 'Invalid role' });
            }
            updates.role = role;
        }
        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length === 0) {
            res.json({ id: existing.id, email: existing.email, role: existing.role });
            return;
        }

        const [updated] = await db('users')
            .where({ id })
            .update(updates)
            .returning(['id', 'email', 'role', 'created_at']);

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Delete user
cmsUsersRouter.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        // Note: req.user is guaranteed by requireAuth middleware
        if (req.user!.id === id) {
            throw new ApiError({
                status: 400,
                code: 'validation_error',
                message: 'You cannot delete yourself'
            });
        }

        const deleted = await db('users').where({ id }).delete();
        if (!deleted) {
            throw new ApiError({ status: 404, code: 'not_found', message: 'User not found' });
        }

        res.status(204).end();
    } catch (err) {
        next(err);
    }
});
