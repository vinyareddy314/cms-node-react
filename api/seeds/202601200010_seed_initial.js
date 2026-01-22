const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function seed(knex) {
  await knex('lesson_assets').del();
  await knex('program_assets').del();
  await knex('lessons').del();
  await knex('terms').del();
  await knex('program_topics').del();
  await knex('topics').del();
  await knex('programs').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { id: uuid(), email: 'admin@example.com', role: 'admin' },
    { id: uuid(), email: 'editor@example.com', role: 'editor' },
    { id: uuid(), email: 'viewer@example.com', role: 'viewer' }
  ].map((u) => ({ ...u, password_hash: passwordHash }));

  await knex('users').insert(users);

  const topics = [
    { name: 'Math' },
    { name: 'Science' },
    { name: 'Language' }
  ];
  const topicIds = await knex('topics').insert(topics).returning(['id', 'name']);

  const program1Id = uuid();
  const program2Id = uuid();

  const programs = [
    {
      id: program1Id,
      title: 'Bilingual Math Basics',
      description: 'Math fundamentals in English and Telugu.',
      language_primary: 'en',
      languages_available: ['en', 'te'],
      status: 'draft'
    },
    {
      id: program2Id,
      title: 'Science Starter',
      description: 'Introductory science lessons.',
      language_primary: 'en',
      languages_available: ['en'],
      status: 'draft'
    }
  ];

  await knex('programs').insert(programs);

  const mathTopic = topicIds.find((t) => t.name === 'Math');
  const scienceTopic = topicIds.find((t) => t.name === 'Science');

  await knex('program_topics').insert([
    { program_id: program1Id, topic_id: mathTopic.id },
    { program_id: program2Id, topic_id: scienceTopic.id }
  ]);

  const term1Id = uuid();
  const term2Id = uuid();

  await knex('terms').insert([
    { id: term1Id, program_id: program1Id, term_number: 1, title: 'Term 1' },
    { id: term2Id, program_id: program2Id, term_number: 1, title: 'Term 1' }
  ]);

  const now = new Date();
  const inOneMinute = new Date(now.getTime() + 60 * 1000);

  const lessonIds = {
    l1: uuid(),
    l2: uuid(),
    l3: uuid(),
    l4: uuid(),
    l5: uuid(),
    l6: uuid()
  };

  const lessons = [
    {
      id: lessonIds.l1,
      term_id: term1Id,
      lesson_number: 1,
      title: 'Introduction to Addition (EN)',
      content_type: 'video',
      duration_ms: 300000,
      is_paid: false,
      content_language_primary: 'en',
      content_languages_available: ['en', 'te'],
      content_urls_by_language: {
        en: 'https://example.com/video/addition-en',
        te: 'https://example.com/video/addition-te'
      },
      subtitle_languages: ['en'],
      subtitle_urls_by_language: {
        en: 'https://example.com/subtitles/addition-en.vtt'
      },
      status: 'published',
      publish_at: now,
      published_at: now
    },
    {
      id: lessonIds.l2,
      term_id: term1Id,
      lesson_number: 2,
      title: 'Subtraction Basics (TE primary)',
      content_type: 'video',
      duration_ms: 280000,
      is_paid: true,
      content_language_primary: 'te',
      content_languages_available: ['te', 'en'],
      content_urls_by_language: {
        te: 'https://example.com/video/subtraction-te',
        en: 'https://example.com/video/subtraction-en'
      },
      subtitle_languages: ['te'],
      subtitle_urls_by_language: {
        te: 'https://example.com/subtitles/subtraction-te.vtt'
      },
      status: 'draft'
    },
    {
      id: lessonIds.l3,
      term_id: term1Id,
      lesson_number: 3,
      title: 'Multiplication Basics (scheduled)',
      content_type: 'video',
      duration_ms: 320000,
      is_paid: true,
      content_language_primary: 'en',
      content_languages_available: ['en'],
      content_urls_by_language: {
        en: 'https://example.com/video/multiplication-en'
      },
      subtitle_languages: ['en'],
      subtitle_urls_by_language: {
        en: 'https://example.com/subtitles/multiplication-en.vtt'
      },
      status: 'scheduled',
      publish_at: inOneMinute
    },
    {
      id: lessonIds.l4,
      term_id: term2Id,
      lesson_number: 1,
      title: 'What is Science?',
      content_type: 'video',
      duration_ms: 250000,
      is_paid: false,
      content_language_primary: 'en',
      content_languages_available: ['en'],
      content_urls_by_language: {
        en: 'https://example.com/video/what-is-science-en'
      },
      status: 'published',
      publish_at: now,
      published_at: now
    },
    {
      id: lessonIds.l5,
      term_id: term2Id,
      lesson_number: 2,
      title: 'States of Matter',
      content_type: 'article',
      duration_ms: null,
      is_paid: false,
      content_language_primary: 'en',
      content_languages_available: ['en'],
      content_urls_by_language: {
        en: 'https://example.com/article/states-of-matter-en'
      },
      status: 'draft'
    },
    {
      id: lessonIds.l6,
      term_id: term2Id,
      lesson_number: 3,
      title: 'Gravity Basics',
      content_type: 'video',
      duration_ms: 260000,
      is_paid: true,
      content_language_primary: 'en',
      content_languages_available: ['en'],
      content_urls_by_language: {
        en: 'https://example.com/video/gravity-en'
      },
      status: 'draft'
    }
  ];

  await knex('lessons').insert(lessons);

  const programAssets = [
    {
      id: uuid(),
      program_id: program1Id,
      language: 'en',
      variant: 'portrait',
      asset_type: 'poster',
      url: 'https://example.com/posters/program1-en-portrait.jpg'
    },
    {
      id: uuid(),
      program_id: program1Id,
      language: 'en',
      variant: 'landscape',
      asset_type: 'poster',
      url: 'https://example.com/posters/program1-en-landscape.jpg'
    },
    {
      id: uuid(),
      program_id: program1Id,
      language: 'te',
      variant: 'portrait',
      asset_type: 'poster',
      url: 'https://example.com/posters/program1-te-portrait.jpg'
    },
    {
      id: uuid(),
      program_id: program1Id,
      language: 'te',
      variant: 'landscape',
      asset_type: 'poster',
      url: 'https://example.com/posters/program1-te-landscape.jpg'
    },
    {
      id: uuid(),
      program_id: program2Id,
      language: 'en',
      variant: 'portrait',
      asset_type: 'poster',
      url: 'https://example.com/posters/program2-en-portrait.jpg'
    },
    {
      id: uuid(),
      program_id: program2Id,
      language: 'en',
      variant: 'landscape',
      asset_type: 'poster',
      url: 'https://example.com/posters/program2-en-landscape.jpg'
    }
  ];

  await knex('program_assets').insert(programAssets);

  const lessonAssets = [];
  const addThumbs = (lessonId, primaryLang) => {
    lessonAssets.push(
      {
        id: uuid(),
        lesson_id: lessonId,
        language: primaryLang,
        variant: 'portrait',
        asset_type: 'thumbnail',
        url: `https://example.com/thumbnails/${lessonId}-${primaryLang}-portrait.jpg`
      },
      {
        id: uuid(),
        lesson_id: lessonId,
        language: primaryLang,
        variant: 'landscape',
        asset_type: 'thumbnail',
        url: `https://example.com/thumbnails/${lessonId}-${primaryLang}-landscape.jpg`
      }
    );
  };

  addThumbs(lessonIds.l1, 'en');
  addThumbs(lessonIds.l2, 'te');
  addThumbs(lessonIds.l3, 'en');
  addThumbs(lessonIds.l4, 'en');
  addThumbs(lessonIds.l5, 'en');
  addThumbs(lessonIds.l6, 'en');

  await knex('lesson_assets').insert(lessonAssets);
};


