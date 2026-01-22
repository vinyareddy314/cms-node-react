import dotenv from 'dotenv';
import winston from 'winston';
import { db } from './db';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

async function tick() {
  const startedAt = new Date().toISOString();

  const result = await db.transaction(async (trx) => {
    // Concurrency-safe: lock scheduled lessons due now, skip locked so multiple workers can run
    const dueLessons = await trx('lessons')
      .select('id', 'term_id', 'content_language_primary')
      .where('status', 'scheduled')
      .andWhere('publish_at', '<=', trx.fn.now())
      .forUpdate()
      .skipLocked();

    let publishedCount = 0;
    for (const lesson of dueLessons as any[]) {
      // Validate thumbnail requirements (strict); if missing, skip and keep scheduled
      const thumbs = await trx('lesson_assets')
        .select('variant')
        .where({
          lesson_id: lesson.id,
          language: lesson.content_language_primary,
          asset_type: 'thumbnail'
        });
      const hasPortrait = (thumbs as any[]).some((t) => t.variant === 'portrait');
      const hasLandscape = (thumbs as any[]).some((t) => t.variant === 'landscape');
      if (!hasPortrait || !hasLandscape) {
        logger.warn({
          msg: 'publish_skipped_missing_thumbnails',
          lessonId: lesson.id,
          language: lesson.content_language_primary
        });
        continue;
      }

      const updated = await trx('lessons')
        .where({ id: lesson.id, status: 'scheduled' })
        .andWhere('publish_at', '<=', trx.fn.now())
        .update({
          status: 'published',
          published_at: trx.raw('COALESCE(published_at, now())')
        })
        .returning(['id', 'term_id', 'published_at']);

      if (!updated || (updated as any[]).length === 0) continue;
      publishedCount += 1;

      const term = await trx('terms').select('program_id').where({ id: lesson.term_id }).first();
      if (term) {
        await trx('programs')
          .where({ id: term.program_id })
          .andWhereNot('status', 'archived')
          .update({
            status: 'published',
            published_at: trx.raw('COALESCE(published_at, now())')
          });
      }
    }

    return { due: (dueLessons as any[]).length, published: publishedCount };
  });

  logger.info({
    msg: 'worker_tick_complete',
    startedAt,
    dueLessons: result.due,
    publishedLessons: result.published
  });
}

async function main() {
  logger.info({ msg: 'worker starting' });

  // keep the db connection warm / validate config early
  await db.raw('select 1');

  await tick();
  setInterval(() => {
    tick().catch((err) => logger.error({ msg: 'tick failed', err: String(err) }));
  }, 60_000);
}

main().catch((err) => {
  logger.error({ msg: 'worker crashed', err: String(err) });
  process.exit(1);
});


