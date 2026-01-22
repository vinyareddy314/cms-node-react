/**
 * Core schema: users, topics, programs, terms, lessons, assets, m2m tables.
 */

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.enu('role', ['admin', 'editor', 'viewer'], {
      useNative: true,
      enumName: 'user_role'
    }).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('topics', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
  });

  await knex.schema.createTable('programs', (table) => {
    table.uuid('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('language_primary').notNullable();
    table.specificType('languages_available', 'text[]').notNullable();
    table.enu('status', ['draft', 'published', 'archived'], {
      useNative: true,
      enumName: 'program_status'
    }).notNullable().defaultTo('draft');
    table.timestamp('published_at');
    table.timestamps(true, true);

    table.check("array_position(languages_available, language_primary) IS NOT NULL", [], 'program_primary_language_check');
  });

  await knex.schema.createTable('program_topics', (table) => {
    table.uuid('program_id').notNullable();
    table
      .integer('topic_id')
      .notNullable()
      .references('id')
      .inTable('topics')
      .onDelete('CASCADE');
    table.primary(['program_id', 'topic_id']);
    table
      .foreign('program_id')
      .references('id')
      .inTable('programs')
      .onDelete('CASCADE');
  });

  await knex.schema.createTable('terms', (table) => {
    table.uuid('id').primary();
    table
      .uuid('program_id')
      .notNullable()
      .references('id')
      .inTable('programs')
      .onDelete('CASCADE');
    table.integer('term_number').notNullable();
    table.string('title');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['program_id', 'term_number']);
  });

  await knex.schema.createTable('lessons', (table) => {
    table.uuid('id').primary();
    table
      .uuid('term_id')
      .notNullable()
      .references('id')
      .inTable('terms')
      .onDelete('CASCADE');
    table.integer('lesson_number').notNullable();
    table.string('title').notNullable();
    table.enu('content_type', ['video', 'article'], {
      useNative: true,
      enumName: 'lesson_content_type'
    }).notNullable();
    table.integer('duration_ms');
    table.boolean('is_paid').notNullable().defaultTo(false);

    table.string('content_language_primary').notNullable();
    table.specificType('content_languages_available', 'text[]').notNullable();
    table.jsonb('content_urls_by_language').notNullable();

    table.specificType('subtitle_languages', 'text[]');
    table.jsonb('subtitle_urls_by_language');

    table.enu('status', ['draft', 'scheduled', 'published', 'archived'], {
      useNative: true,
      enumName: 'lesson_status'
    }).notNullable().defaultTo('draft');
    table.timestamp('publish_at');
    table.timestamp('published_at');
    table.timestamps(true, true);

    table.unique(['term_id', 'lesson_number']);

    table.check(
      "content_type <> 'video' OR duration_ms IS NOT NULL",
      [],
      'lesson_video_duration_check'
    );
    table.check(
      "array_position(content_languages_available, content_language_primary) IS NOT NULL",
      [],
      'lesson_primary_language_check'
    );
    table.check(
      "(status <> 'scheduled') OR (publish_at IS NOT NULL)",
      [],
      'lesson_scheduled_publish_at_check'
    );
    table.check(
      "(status <> 'published') OR (published_at IS NOT NULL)",
      [],
      'lesson_published_at_check'
    );
  });

  await knex.schema.createTable('program_assets', (table) => {
    table.uuid('id').primary();
    table
      .uuid('program_id')
      .notNullable()
      .references('id')
      .inTable('programs')
      .onDelete('CASCADE');
    table.string('language').notNullable();
    table.enu('variant', ['portrait', 'landscape', 'square', 'banner'], {
      useNative: true,
      enumName: 'asset_variant'
    }).notNullable();
    table.enu('asset_type', ['poster'], {
      useNative: true,
      enumName: 'program_asset_type'
    }).notNullable();
    table.string('url').notNullable();

    table.unique(['program_id', 'language', 'variant', 'asset_type']);
    table.index(['program_id', 'language'], 'idx_program_assets_program_language');
  });

  await knex.schema.createTable('lesson_assets', (table) => {
    table.uuid('id').primary();
    table
      .uuid('lesson_id')
      .notNullable()
      .references('id')
      .inTable('lessons')
      .onDelete('CASCADE');
    table.string('language').notNullable();
    table.enu('variant', ['portrait', 'landscape', 'square', 'banner'], {
      useNative: true,
      enumName: 'lesson_asset_variant'
    }).notNullable();
    table.enu('asset_type', ['thumbnail', 'subtitle'], {
      useNative: true,
      enumName: 'lesson_asset_type'
    }).notNullable();
    table.string('url').notNullable();

    table.unique(['lesson_id', 'language', 'variant', 'asset_type']);
    table.index(['lesson_id', 'language'], 'idx_lesson_assets_lesson_language');
  });

  // Index expectations
  await knex.schema.alterTable('lessons', (table) => {
    table.index(['status', 'publish_at'], 'idx_lessons_status_publish_at');
    table.index(['term_id', 'lesson_number'], 'idx_lessons_term_lesson_number');
  });

  await knex.schema.alterTable('programs', (table) => {
    table.index(['status', 'language_primary', 'published_at'], 'idx_programs_status_lang_published_at');
  });

  await knex.schema.alterTable('program_topics', (table) => {
    table.index(['topic_id', 'program_id'], 'idx_program_topics_topic_program');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('program_topics', (table) => {
    table.dropIndex([], 'idx_program_topics_topic_program');
  });

  await knex.schema.alterTable('programs', (table) => {
    table.dropIndex([], 'idx_programs_status_lang_published_at');
  });

  await knex.schema.alterTable('lessons', (table) => {
    table.dropIndex([], 'idx_lessons_status_publish_at');
    table.dropIndex([], 'idx_lessons_term_lesson_number');
  });

  await knex.schema.dropTableIfExists('lesson_assets');
  await knex.schema.dropTableIfExists('program_assets');
  await knex.schema.dropTableIfExists('lessons');
  await knex.schema.dropTableIfExists('terms');
  await knex.schema.dropTableIfExists('program_topics');
  await knex.schema.dropTableIfExists('programs');
  await knex.schema.dropTableIfExists('topics');
  await knex.schema.dropTableIfExists('users');

  await knex.raw('DROP TYPE IF EXISTS lesson_asset_type');
  await knex.raw('DROP TYPE IF EXISTS lesson_asset_variant');
  await knex.raw('DROP TYPE IF EXISTS program_asset_type');
  await knex.raw('DROP TYPE IF EXISTS asset_variant');
  await knex.raw('DROP TYPE IF EXISTS lesson_status');
  await knex.raw('DROP TYPE IF EXISTS lesson_content_type');
  await knex.raw('DROP TYPE IF EXISTS program_status');
  await knex.raw('DROP TYPE IF EXISTS user_role');
};


