import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuid } from 'uuid';
import { checkDbConnection } from './db';
import { authRouter } from './auth/routes';
import { cmsProgramsRouter } from './cms/programs';
import { cmsTopicsRouter } from './cms/topics';
import { cmsTermsLessonsRouter } from './cms/terms_lessons';
import { cmsUsersRouter } from './cms/users';
import { catalogRouter } from './catalog/routes';
import { ApiError } from './types';
import { logger } from './logger';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Simple request-id logger with structured logs
app.use((req, res, next) => {
  const requestId = uuid();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

app.get('/health', async (_req, res) => {
  try {
    await checkDbConnection();
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

// Auth + CMS routes
app.use('/auth', authRouter);
app.use('/cms/users', cmsUsersRouter);
app.use('/cms/programs', cmsProgramsRouter);
app.use('/cms/topics', cmsTopicsRouter);
app.use('/cms', cmsTermsLessonsRouter);
app.use('/catalog', catalogRouter);

// 404 handler
app.use((req, _res, next) => {
  next(new ApiError({ status: 404, code: 'not_found', message: `Route ${req.path} not found` }));
});

// Global error handler with consistent format
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).requestId;

  // Translate common Postgres/Knex errors into validation errors
  const maybePgErr = err as any;
  if (maybePgErr && typeof maybePgErr === 'object' && typeof maybePgErr.code === 'string') {
    const pgCode = maybePgErr.code as string;
    const details = {
      pgCode,
      constraint: maybePgErr.constraint,
      table: maybePgErr.table,
      detail: maybePgErr.detail
    };

    if (pgCode === '23505') {
      // unique_violation
      const e = new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'Unique constraint violation',
        details
      });
      logger.warn({ msg: 'db_error', requestId, ...details });
      res.status(e.status).json({ code: e.code, message: e.message, details: e.details, requestId });
      return;
    }

    if (pgCode === '23514') {
      // check_violation
      const e = new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'Check constraint violation',
        details
      });
      logger.warn({ msg: 'db_error', requestId, ...details });
      res.status(e.status).json({ code: e.code, message: e.message, details: e.details, requestId });
      return;
    }

    if (pgCode === '23503') {
      // foreign_key_violation
      const e = new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'Foreign key constraint violation',
        details
      });
      logger.warn({ msg: 'db_error', requestId, ...details });
      res.status(e.status).json({ code: e.code, message: e.message, details: e.details, requestId });
      return;
    }
  }

  if (err instanceof ApiError) {
    logger.error({
      msg: 'request_error',
      requestId,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      details: err.details,
      requestId
    });
    return;
  }

  logger.error({
    msg: 'unhandled_error',
    requestId,
    err: String(err),
    stack: (err as any)?.stack
  });
  res.status(500).json({
    code: 'internal_error',
    message: 'Internal server error',
    requestId
  });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});

