import { Router } from 'express';
import { db } from '../db';
import { ApiError } from '../types';

export const catalogRouter = Router();

function setCatalogCacheHeaders(res: any) {
  // demo-friendly caching
  res.setHeader('Cache-Control', 'public, max-age=30');
}

function encodeCursor(obj: any) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    throw new ApiError({ status: 400, code: 'validation_error', message: 'Invalid cursor' });
  }
}

async function loadProgramPosters(programIds: string[]) {
  const rows = programIds.length
    ? await db('program_assets')
        .select('program_id', 'language', 'variant', 'url')
        .whereIn('program_id', programIds)
        .andWhere('asset_type', 'poster')
    : [];

  const postersByProgram: Record<string, Record<string, Record<string, string>>> = {};
  for (const r of rows as any[]) {
    postersByProgram[r.program_id] ??= {};
    postersByProgram[r.program_id][r.language] ??= {};
    postersByProgram[r.program_id][r.language][r.variant] = r.url;
  }
  return postersByProgram;
}

async function loadLessonThumbnails(lessonIds: string[]) {
  const rows = lessonIds.length
    ? await db('lesson_assets')
        .select('lesson_id', 'language', 'variant', 'url')
        .whereIn('lesson_id', lessonIds)
        .andWhere('asset_type', 'thumbnail')
    : [];

  const thumbsByLesson: Record<string, Record<string, Record<string, string>>> = {};
  for (const r of rows as any[]) {
    thumbsByLesson[r.lesson_id] ??= {};
    thumbsByLesson[r.lesson_id][r.language] ??= {};
    thumbsByLesson[r.lesson_id][r.language][r.variant] = r.url;
  }
  return thumbsByLesson;
}

// GET /catalog/programs?language=&topic=&cursor=&limit=
catalogRouter.get('/programs', async (req, res, next) => {
  try {
    setCatalogCacheHeaders(res);

    const language = req.query.language ? String(req.query.language) : undefined;
    const topic = req.query.topic ? String(req.query.topic) : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
    const cursor = decodeCursor(req.query.cursor ? String(req.query.cursor) : undefined) as
      | { lastPublishedAt: string; programId: string }
      | null;

    // Programs with >= 1 published lesson, ordered by most recently published lesson
    const base = db('programs as p')
      .select(
        'p.id',
        'p.title',
        'p.description',
        'p.language_primary',
        'p.languages_available',
        'p.status',
        'p.published_at'
      )
      .select(db.raw('MAX(l.published_at) as last_lesson_published_at'))
      .join('terms as tr', 'tr.program_id', 'p.id')
      .join('lessons as l', 'l.term_id', 'tr.id')
      .where('l.status', 'published')
      .groupBy('p.id');

    if (language) {
      base.where('p.language_primary', language);
    }
    if (topic) {
      base
        .join('program_topics as pt', 'pt.program_id', 'p.id')
        .join('topics as t', 't.id', 'pt.topic_id')
        .where('t.name', topic);
    }

    if (cursor?.lastPublishedAt && cursor?.programId) {
      // keyset pagination (last_lesson_published_at desc, id desc)
      base.andWhere((qb) => {
        qb.whereRaw('MAX(l.published_at) < ?', [cursor.lastPublishedAt]).orWhere((qb2) => {
          qb2
            .whereRaw('MAX(l.published_at) = ?', [cursor.lastPublishedAt])
            .andWhere('p.id', '<', cursor.programId);
        });
      });
    }

    const rows = await base
      .orderBy([{ column: 'last_lesson_published_at', order: 'desc' }, { column: 'p.id', order: 'desc' }])
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = (rows as any[]).slice(0, limit);

    const programIds = page.map((r) => r.id);
    const postersByProgram = await loadProgramPosters(programIds);

    const nextCursor =
      hasMore && page.length
        ? encodeCursor({
            lastPublishedAt: page[page.length - 1].last_lesson_published_at,
            programId: page[page.length - 1].id
          })
        : null;

    res.json({
      programs: page.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        language_primary: p.language_primary,
        languages_available: p.languages_available,
        status: p.status,
        published_at: p.published_at,
        assets: { posters: postersByProgram[p.id] || {} }
      })),
      next_cursor: nextCursor
    });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/programs/:id  (includes terms + published lessons only)
catalogRouter.get('/programs/:id', async (req, res, next) => {
  try {
    setCatalogCacheHeaders(res);

    const id = String(req.params.id);

    // Must have at least one published lesson
    const exists = await db('programs as p')
      .join('terms as tr', 'tr.program_id', 'p.id')
      .join('lessons as l', 'l.term_id', 'tr.id')
      .where('p.id', id)
      .andWhere('l.status', 'published')
      .first('p.id');

    if (!exists) {
      throw new ApiError({ status: 404, code: 'not_found', message: 'Program not found' });
    }

    const program = await db('programs')
      .select(
        'id',
        'title',
        'description',
        'language_primary',
        'languages_available',
        'status',
        'published_at'
      )
      .where({ id })
      .first();

    const terms = await db('terms')
      .select('id', 'term_number', 'title', 'created_at')
      .where({ program_id: id })
      .orderBy('term_number', 'asc');

    const termIds = (terms as any[]).map((t) => t.id);
    const lessons = termIds.length
      ? await db('lessons')
          .select(
            'id',
            'term_id',
            'lesson_number',
            'title',
            'content_type',
            'duration_ms',
            'is_paid',
            'content_language_primary',
            'content_languages_available',
            'content_urls_by_language',
            'subtitle_languages',
            'subtitle_urls_by_language',
            'published_at'
          )
          .whereIn('term_id', termIds)
          .andWhere('status', 'published')
          .orderBy([{ column: 'term_id', order: 'asc' }, { column: 'lesson_number', order: 'asc' }])
      : [];

    const postersByProgram = await loadProgramPosters([id]);
    const lessonIds = (lessons as any[]).map((l) => l.id);
    const thumbsByLesson = await loadLessonThumbnails(lessonIds);

    res.json({
      program: {
        ...program,
        assets: { posters: postersByProgram[id] || {} }
      },
      terms,
      lessons: (lessons as any[]).map((l) => ({
        ...l,
        assets: { thumbnails: thumbsByLesson[l.id] || {} }
      }))
    });
  } catch (err) {
    next(err);
  }
});

// GET /catalog/lessons/:id (published only)
catalogRouter.get('/lessons/:id', async (req, res, next) => {
  try {
    setCatalogCacheHeaders(res);

    const id = String(req.params.id);
    const lesson = await db('lessons')
      .select(
        'id',
        'term_id',
        'lesson_number',
        'title',
        'content_type',
        'duration_ms',
        'is_paid',
        'content_language_primary',
        'content_languages_available',
        'content_urls_by_language',
        'subtitle_languages',
        'subtitle_urls_by_language',
        'published_at'
      )
      .where({ id, status: 'published' })
      .first();

    if (!lesson) {
      throw new ApiError({ status: 404, code: 'not_found', message: 'Lesson not found' });
    }

    const thumbsByLesson = await loadLessonThumbnails([id]);
    res.json({
      lesson: {
        ...lesson,
        assets: { thumbnails: thumbsByLesson[id] || {} }
      }
    });
  } catch (err) {
    next(err);
  }
});


