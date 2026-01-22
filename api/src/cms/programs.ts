import { Router } from 'express';
import { db } from '../db';
import { ApiError } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';

export const cmsProgramsRouter = Router();

// All CMS endpoints require auth; viewer/editor/admin can read
cmsProgramsRouter.use(requireAuth);

cmsProgramsRouter.get('/', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const language = req.query.language_primary ? String(req.query.language_primary) : undefined;
    const topic = req.query.topic ? String(req.query.topic) : undefined;

    const q = db('programs as p')
      .select(
        'p.id',
        'p.title',
        'p.description',
        'p.language_primary',
        'p.languages_available',
        'p.status',
        'p.published_at',
        'p.created_at',
        'p.updated_at'
      )
      .orderBy('p.updated_at', 'desc');

    if (status) q.where('p.status', status);
    if (language) q.where('p.language_primary', language);

    if (topic) {
      q.join('program_topics as pt', 'pt.program_id', 'p.id')
        .join('topics as t', 't.id', 'pt.topic_id')
        .where('t.name', topic);
    }

    const programs = await q;

    // Attach primary-language portrait poster preview (best-effort)
    const ids = programs.map((p: any) => p.id);
    const assets = ids.length
      ? await db('program_assets')
          .select('program_id', 'language', 'variant', 'url')
          .whereIn('program_id', ids)
          .andWhere('asset_type', 'poster')
      : [];

    const postersByProgram: Record<string, Record<string, Record<string, string>>> = {};
    for (const a of assets) {
      postersByProgram[a.program_id] ??= {};
      postersByProgram[a.program_id][a.language] ??= {};
      postersByProgram[a.program_id][a.language][a.variant] = a.url;
    }

    res.json({
      programs: programs.map((p: any) => ({
        ...p,
        assets: {
          posters: postersByProgram[p.id] || {}
        }
      }))
    });
  } catch (err) {
    next(err);
  }
});

cmsProgramsRouter.get('/:id', requireRole(['admin', 'editor', 'viewer']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const program = await db('programs').where({ id }).first();
    if (!program) {
      throw new ApiError({ status: 404, code: 'not_found', message: 'Program not found' });
    }

    const topics = await db('topics as t')
      .select('t.id', 't.name')
      .join('program_topics as pt', 'pt.topic_id', 't.id')
      .where('pt.program_id', id)
      .orderBy('t.name', 'asc');

    const programAssets = await db('program_assets')
      .select('language', 'variant', 'url')
      .where({ program_id: id, asset_type: 'poster' });

    const posters: Record<string, Record<string, string>> = {};
    for (const a of programAssets) {
      posters[a.language] ??= {};
      posters[a.language][a.variant] = a.url;
    }

    const terms = await db('terms')
      .select('id', 'term_number', 'title', 'created_at')
      .where({ program_id: id })
      .orderBy('term_number', 'asc');

    const termIds = terms.map((t: any) => t.id);
    const lessons = termIds.length
      ? await db('lessons')
          .select(
            'id',
            'term_id',
            'lesson_number',
            'title',
            'status',
            'publish_at',
            'published_at',
            'is_paid',
            'content_type',
            'content_language_primary',
            'content_languages_available'
          )
          .whereIn('term_id', termIds)
          .orderBy([{ column: 'term_id', order: 'asc' }, { column: 'lesson_number', order: 'asc' }])
      : [];

    res.json({
      program: {
        ...program,
        topics,
        assets: { posters }
      },
      terms,
      lessons
    });
  } catch (err) {
    next(err);
  }
});


