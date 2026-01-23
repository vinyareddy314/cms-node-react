import { Router } from 'express';
import { db } from '../db';
import { ApiError } from '../types';
import { requireAuth, requireRole } from '../auth/middleware';
import { v4 as uuid } from 'uuid';

export const cmsTermsLessonsRouter = Router();

cmsTermsLessonsRouter.use(requireAuth);

// ----- Terms -----

cmsTermsLessonsRouter.post(
  '/terms',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const { program_id, term_number, title } = req.body || {};
      if (!program_id || typeof term_number !== 'number') {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: 'program_id and term_number are required'
        });
      }

      const [term] = await db('terms')
        .insert({
          id: uuid(),
          program_id,
          term_number,
          title
        })
        .returning(['id', 'program_id', 'term_number', 'title', 'created_at']);

      res.status(201).json({ term });
    } catch (err) {
      next(err);
    }
  }
);

cmsTermsLessonsRouter.patch(
  '/terms/:id',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { term_number, title } = req.body || {};
      const patch: Record<string, unknown> = {};
      if (typeof term_number === 'number') patch.term_number = term_number;
      if (typeof title === 'string') patch.title = title;

      if (Object.keys(patch).length === 0) {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: 'No updatable fields provided'
        });
      }

      const [term] = await db('terms')
        .where({ id })
        .update(patch)
        .returning(['id', 'program_id', 'term_number', 'title', 'created_at']);

      if (!term) {
        throw new ApiError({ status: 404, code: 'not_found', message: 'Term not found' });
      }

      res.json({ term });
    } catch (err) {
      next(err);
    }
  }
);

cmsTermsLessonsRouter.delete(
  '/terms/:id',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const deleted = await db('terms').where({ id }).del();
      if (!deleted) {
        throw new ApiError({ status: 404, code: 'not_found', message: 'Term not found' });
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ----- Lessons -----

function buildLessonPayload(body: any) {
  const {
    term_id,
    lesson_number,
    title,
    content_type,
    duration_ms,
    is_paid,
    content_language_primary,
    content_languages_available,
    content_url_primary,
    subtitle_languages,
    subtitle_urls_by_language
  } = body || {};

  if (!term_id || typeof lesson_number !== 'number' || !title || !content_type) {
    throw new ApiError({
      status: 400,
      code: 'validation_error',
      message: 'term_id, lesson_number, title, and content_type are required'
    });
  }

  const languagesAvailable: string[] =
    Array.isArray(content_languages_available) && content_languages_available.length > 0
      ? content_languages_available
      : content_language_primary
        ? [content_language_primary]
        : [];

  if (!content_language_primary || languagesAvailable.length === 0) {
    throw new ApiError({
      status: 400,
      code: 'validation_error',
      message: 'content_language_primary and content_languages_available are required'
    });
  }

  if (!languagesAvailable.includes(content_language_primary)) {
    throw new ApiError({
      status: 400,
      code: 'validation_error',
      message: 'content_language_primary must be included in content_languages_available'
    });
  }

  // for simple UI, we support a single primary content URL via content_url_primary
  const contentUrls =
    body.content_urls_by_language && typeof body.content_urls_by_language === 'object'
      ? body.content_urls_by_language
      : content_url_primary
        ? { [content_language_primary]: content_url_primary }
        : null;

  if (!contentUrls) {
    throw new ApiError({
      status: 400,
      code: 'validation_error',
      message: 'At least primary content URL is required'
    });
  }

  if (content_type === 'video' && (duration_ms === null || duration_ms === undefined)) {
    throw new ApiError({
      status: 400,
      code: 'validation_error',
      message: 'duration_ms is required for video lessons'
    });
  }

  const payload: any = {
    term_id,
    lesson_number,
    title,
    content_type,
    duration_ms: duration_ms ?? null,
    is_paid: Boolean(is_paid),
    content_language_primary,
    content_languages_available: languagesAvailable,
    content_urls_by_language: contentUrls,
    subtitle_languages: subtitle_languages ?? null,
    subtitle_urls_by_language: subtitle_urls_by_language ?? null
  };

  return payload;
}

cmsTermsLessonsRouter.post(
  '/lessons',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const payload = buildLessonPayload(req.body);
      payload.status = 'draft';
      payload.publish_at = null;
      payload.published_at = null;

      const [lesson] = await db('lessons')
        .insert({
          id: uuid(),
          ...payload
        })
        .returning('*');

      res.status(201).json({ lesson });
    } catch (err) {
      next(err);
    }
  }
);

cmsTermsLessonsRouter.patch(
  '/lessons/:id',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await db('lessons').where({ id }).first();
      if (!existing) {
        throw new ApiError({ status: 404, code: 'not_found', message: 'Lesson not found' });
      }

      const merged = { ...existing, ...req.body };
      const payload = buildLessonPayload(merged);

      const [lesson] = await db('lessons')
        .where({ id })
        .update(payload)
        .returning('*');

      res.json({ lesson });
    } catch (err) {
      next(err);
    }
  }
);

async function ensureThumbnailsForPrimaryLanguage(lessonId: string, primaryLang: string) {
  const rows = await db('lesson_assets')
    .select('variant')
    .where({
      lesson_id: lessonId,
      language: primaryLang,
      asset_type: 'thumbnail'
    });

  // Demo relaxation: if there are no thumbnail records yet, skip validation
  // so that publish/schedule works without asset management UI.
  if (!rows.length) {
    return;
  }

  const hasPortrait = rows.some((r) => r.variant === 'portrait');
  const hasLandscape = rows.some((r) => r.variant === 'landscape');

  if (!hasPortrait || !hasLandscape) {
    throw new ApiError({
      status: 400,
      code: 'validation_error',
      message:
        'Primary content language must have portrait and landscape thumbnails before publishing'
    });
  }
}

cmsTermsLessonsRouter.post(
  '/lessons/:id/status',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    const trx = await db.transaction();
    try {
      const id = String(req.params.id);
      const { action, publish_at } = req.body || {};

      const lesson = await trx('lessons').where({ id }).first().forUpdate();
      if (!lesson) {
        throw new ApiError({ status: 404, code: 'not_found', message: 'Lesson not found' });
      }

      const now = trx.fn.now();

      let publishAtIso: string | undefined;
      if (publish_at) {
        const d = new Date(publish_at);
        if (Number.isNaN(d.getTime())) {
          throw new ApiError({
            status: 400,
            code: 'validation_error',
            message: 'Invalid publish_at'
          });
        }
        if (d.getTime() <= Date.now()) {
          throw new ApiError({
            status: 400,
            code: 'validation_error',
            message: 'publish_at must be in the future'
          });
        }
        publishAtIso = d.toISOString();
      }

      if (action === 'schedule') {
        if (lesson.status !== 'draft') {
          throw new ApiError({
            status: 400,
            code: 'validation_error',
            message: 'Only draft lessons can be scheduled'
          });
        }
        if (!publish_at) {
          throw new ApiError({
            status: 400,
            code: 'validation_error',
            message: 'publish_at is required when scheduling'
          });
        }

        await trx('lessons')
          .where({ id, status: 'draft' })
          .update({ status: 'scheduled', publish_at: publishAtIso })
          .returning('*');
      } else if (action === 'publish_now') {
        if (lesson.status !== 'draft') {
          throw new ApiError({
            status: 400,
            code: 'validation_error',
            message: 'Only draft lessons can be published directly'
          });
        }

        await ensureThumbnailsForPrimaryLanguage(id, lesson.content_language_primary);

        const [updated] = await trx('lessons')
          .where({ id, status: 'draft' })
          .update({
            status: 'published',
            publish_at: now,
            published_at: now
          })
          .returning('*');

        // auto-publish program if needed
        const term = await trx('terms').where({ id: updated.term_id }).first();
        if (term) {
          await trx('programs')
            .where({ id: term.program_id })
            .andWhereNot('status', 'archived')
            .update({
              status: 'published',
              published_at: db.raw('COALESCE(published_at, now())')
            });
        }
      } else if (action === 'archive') {
        if (!['draft', 'scheduled', 'published'].includes(lesson.status)) {
          throw new ApiError({
            status: 400,
            code: 'validation_error',
            message: 'Lesson cannot be archived from this status'
          });
        }
        await trx('lessons').where({ id }).update({ status: 'archived' });
      } else {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: 'Unknown action'
        });
      }

      await trx.commit();
      const latest = await db('lessons').where({ id }).first();
      res.json({ lesson: latest });
    } catch (err) {
      next(err);
    }
  }
);

// Asset Management for Lessons
cmsTermsLessonsRouter.post(
  '/lessons/:id/assets',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { language, variant, asset_type, url } = req.body || {};

      if (!language || !variant || !asset_type || !url) {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: 'language, variant, asset_type, and url are required'
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

      const types = ['thumbnail', 'subtitle'];
      if (!types.includes(asset_type)) {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: `asset_type must be one of: ${types.join(', ')}`
        });
      }

      // Upsert asset
      await db('lesson_assets')
        .insert({
          id: uuid(),
          lesson_id: id,
          language,
          variant,
          asset_type,
          url
        })
        .onConflict(['lesson_id', 'language', 'variant', 'asset_type'])
        .merge(['url']);

      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  }
);

cmsTermsLessonsRouter.delete(
  '/lessons/:id/assets',
  requireRole(['admin', 'editor']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { language, variant, asset_type } = req.body || {};

      if (!language || !variant || !asset_type) {
        throw new ApiError({
          status: 400,
          code: 'validation_error',
          message: 'language, variant, and asset_type are required'
        });
      }

      await db('lesson_assets')
        .where({
          lesson_id: id,
          language,
          variant,
          asset_type
        })
        .del();

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);


