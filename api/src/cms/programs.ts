import { Router } from 'express';
import { v4 as uuid } from 'uuid';
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
      : [];

    // Attach lesson thumbnails
    const lessonIds = lessons.map((l: any) => l.id);
    const lessonAssets = lessonIds.length
      ? await db('lesson_assets')
        .select('lesson_id', 'language', 'variant', 'url')
        .whereIn('lesson_id', lessonIds)
        .andWhere('asset_type', 'thumbnail')
      : [];

    const thumbnailsByLesson: Record<string, Record<string, Record<string, string>>> = {};
    for (const a of lessonAssets) {
      thumbnailsByLesson[a.lesson_id] ??= {};
      thumbnailsByLesson[a.lesson_id][a.language] ??= {};
      thumbnailsByLesson[a.lesson_id][a.language][a.variant] = a.url;
    }

    const lessonsWithAssets = lessons.map((l: any) => ({
      ...l,
      assets: {
        thumbnails: thumbnailsByLesson[l.id] || {}
      }
    }));

    res.json({
      program: {
        ...program,
        topics,
        assets: { posters }
      },
      terms,
      lessons: lessonsWithAssets
    });
  } catch (err) {
    next(err);
  }
});

cmsProgramsRouter.post('/', requireRole(['admin', 'editor']), async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const { title, description, language_primary, languages_available, topics } = req.body || {};

    if (!title || !language_primary) {
      throw new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'title and language_primary are required'
      });
    }

    const availableLanguages = Array.isArray(languages_available) && languages_available.length > 0
      ? languages_available
      : [language_primary];

    if (!availableLanguages.includes(language_primary)) {
      throw new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'language_primary must be included in languages_available'
      });
    }

    const id = uuid();
    const [program] = await trx('programs')
      .insert({
        id,
        title,
        description,
        language_primary,
        languages_available: availableLanguages,
        status: 'draft'
      })
      .returning('*');

    if (Array.isArray(topics) && topics.length > 0) {
      const topicInserts = topics.map((topicId: any) => ({
        program_id: id,
        topic_id: topicId
      }));
      await trx('program_topics').insert(topicInserts);
    }

    await trx.commit();
    res.status(201).json({ program });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
});

cmsProgramsRouter.patch('/:id', requireRole(['admin', 'editor']), async (req, res, next) => {
  const trx = await db.transaction();
  try {
    const id = String(req.params.id);
    const { title, description, language_primary, languages_available, topics, status } = req.body || {};

    const program = await trx('programs').where({ id }).first();
    if (!program) {
      throw new ApiError({ status: 404, code: 'not_found', message: 'Program not found' });
    }

    const patch: any = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (language_primary !== undefined) patch.language_primary = language_primary;
    if (languages_available !== undefined) patch.languages_available = languages_available;
    if (status !== undefined) patch.status = status;

    if (patch.languages_available || patch.language_primary) {
      const newPrimary = patch.language_primary || program.language_primary;
      const newAvailable = patch.languages_available || program.languages_available;
      if (!newAvailable.includes(newPrimary)) {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: 'language_primary must be included in languages_available'
        });
      }
    }

    let updated = program;
    if (Object.keys(patch).length > 0) {
      [updated] = await trx('programs').where({ id }).update(patch).returning('*');
    }

    if (Array.isArray(topics)) {
      await trx('program_topics').where({ program_id: id }).del();
      if (topics.length > 0) {
        const topicInserts = topics.map((topicId: any) => ({
          program_id: id,
          topic_id: topicId
        }));
        await trx('program_topics').insert(topicInserts);
      }
    }

    await trx.commit();
    res.json({ program: updated });
  } catch (err) {
    await trx.rollback();
    next(err);
  }
});

// Asset Management for Programs
cmsProgramsRouter.post('/:id/assets', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { language, variant, url } = req.body || {};

    if (!language || !variant || !url) {
      throw new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'language, variant, and url are required'
      });
    }

    const variants = ['portrait', 'landscape', 'square', 'banner'];
    if (!variants.includes(variant)) {
      throw new ApiError({
        status: 400,
        code: 'validation_error',
        message: `variant must be one of: ${variants.join(', ')}`
      });
    }

    // Upsert asset
    await db('program_assets')
      .insert({
        id: uuid(),
        program_id: id,
        language,
        variant,
        asset_type: 'poster',
        url
      })
      .onConflict(['program_id', 'language', 'variant', 'asset_type'])
      .merge(['url']); // Update URL if exists

    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

cmsProgramsRouter.delete('/:id/assets', requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const { language, variant } = req.body || {};

    if (!language || !variant) {
      throw new ApiError({
        status: 400,
        code: 'validation_error',
        message: 'language and variant are required'
      });
    }

    await db('program_assets')
      .where({
        program_id: id,
        language,
        variant,
        asset_type: 'poster'
      })
      .del();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});


