import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { contentTypeSchema } from '../../app/(admin)/content/schema';
import { CONTENT_TYPE_DEFS, CREATE_CHOICES, quizDefaultsFor } from '../content/types/registry';
import { publishWarnings } from '../content/types/readiness';
import { contentBuilderSchema } from '../../app/(admin)/content/[id]/schema';
import { builderMetadataPatch } from '../../app/(admin)/content/[id]/metadata-patch';
import { toBuilderInput, type BuilderForm } from '../../app/(admin)/content/[id]/builder-form';
import { InvalidVideoUrlError } from '../content/student-metadata';

// Mirrors the content_type enum (@rms/db is server-only, so tests use the admin schema's copy).
const CONTENT_TYPES = contentTypeSchema.options;

const ID = '11111111-1111-4111-8111-111111111111';

const form = (patch: Partial<BuilderForm> = {}): BuilderForm => ({
  title: 'Sliding window',
  slug: 'sliding-window',
  description: '',
  programId: 'global',
  topic: 'Arrays',
  videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
  resourceLink: 'https://docs.example.com/x',
  notes: 'Some notes',
  durationMinutes: '20',
  rubric: [{ key: 'k1', title: 'Correctness', maxPoints: '50', description: '' }],
  externalProvider: 'QwikTest',
  externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
  assessmentCode: 'QT-CSE26-20261025-apt',
  ...patch
});

describe('content type registry', () => {
  it('describes every content_type enum value', () => {
    expect(Object.keys(CONTENT_TYPE_DEFS).sort()).toEqual([...CONTENT_TYPES].sort());
  });

  it('offers practice and formal quizzes as separate create choices backed by the quiz type', () => {
    const quizChoices = CREATE_CHOICES.filter((c) => c.contentType === 'quiz');
    expect(quizChoices.map((c) => c.quizType)).toEqual(['practice', 'formal']);
    // Every enum value can be created.
    expect(new Set(CREATE_CHOICES.map((c) => c.contentType))).toEqual(new Set(CONTENT_TYPES));
  });

  it('starts formal assessments timed with explanations after the deadline', () => {
    expect(quizDefaultsFor('formal')).toEqual({ quizType: 'formal', timeLimitMinutes: 30, showExplanations: 'after_deadline' });
    expect(quizDefaultsFor('practice')).toEqual({ quizType: 'practice', timeLimitMinutes: null, showExplanations: 'immediate' });
  });
});

describe('toBuilderInput (form -> typed save payload)', () => {
  it('sends only the item type’s own fields', () => {
    expect(toBuilderInput(ID, 'lecture', form())).toEqual({
      id: ID,
      contentType: 'lecture',
      title: 'Sliding window',
      slug: 'sliding-window',
      description: '',
      programId: null,
      topic: 'Arrays',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      durationMinutes: 20
    });
    const quiz = toBuilderInput(ID, 'quiz', form({ programId: '7' }));
    expect(quiz).toMatchObject({ contentType: 'quiz', programId: 7 });
    expect(quiz).not.toHaveProperty('notes');
    expect(quiz).not.toHaveProperty('durationMinutes');
  });

  it('produces payloads the server schema accepts for every type', () => {
    for (const type of CONTENT_TYPES) {
      const parsed = contentBuilderSchema.safeParse(toBuilderInput(ID, type, form()));
      expect(parsed.success, type).toBe(true);
    }
  });

  it('sends an empty duration as null', () => {
    expect(toBuilderInput(ID, 'notes', form({ durationMinutes: ' ' }))).toMatchObject({ durationMinutes: null });
  });
});

describe('builderMetadataPatch', () => {
  const parse = (type: (typeof CONTENT_TYPES)[number], patch: Partial<BuilderForm> = {}) => {
    const parsed = contentBuilderSchema.parse(toBuilderInput(ID, type, form(patch)));
    return builderMetadataPatch(parsed);
  };

  it('writes the keys the student portal reads for each type', () => {
    expect(parse('lecture')).toEqual({
      topic: 'Arrays',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      durationMinutes: 20
    });
    expect(parse('resource')).toMatchObject({ documentUrl: 'https://docs.example.com/x', notes: 'Some notes' });
  });

  it('is a patch: types without media fields leave video, notes and duration alone', () => {
    expect(parse('project')).toEqual({ topic: 'Arrays' });
    expect(parse('quiz')).toEqual({ topic: 'Arrays' });
  });

  it('keeps metadata.slug in step with the slug for DSA sheets', () => {
    expect(parse('dsa_sheet')).toEqual({ topic: 'Arrays', slug: 'sliding-window' });
  });

  it('writes external test keys without touching lecture or reading keys', () => {
    expect(parse('external_test')).toEqual({
      topic: 'Arrays',
      externalProvider: 'QwikTest',
      externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
      assessmentCode: 'QT-CSE26-20261025-apt',
      durationMinutes: 20
    });
    expect(parse('external_test', { externalUrl: '', assessmentCode: '' })).toMatchObject({
      externalUrl: null,
      assessmentCode: null
    });
  });

  it('rejects external test links that are not https, and malformed assessment codes', () => {
    const bad = (patch: Partial<BuilderForm>) =>
      contentBuilderSchema.safeParse(toBuilderInput(ID, 'external_test', form(patch))).success;
    expect(bad({ externalUrl: 'http://rms-careers.qwiktest.in/a' })).toBe(false);
    expect(bad({ externalUrl: 'javascript:alert(1)' })).toBe(false);
    expect(bad({ assessmentCode: 'QT 2026/apt' })).toBe(false);
    expect(bad({ assessmentCode: 'x'.repeat(101) })).toBe(false);
  });

  it('rejects unplayable lecture links', () => {
    expect(() => parse('lecture', { videoUrl: 'https://www.youtube.com/channel/UC123' })).toThrow(InvalidVideoUrlError);
  });
});

describe('publishWarnings', () => {
  const base = { description: '', videoUrl: '', resourceLink: '', notes: '' };

  it('flags content students would find empty', () => {
    expect(publishWarnings({ ...base, type: 'lecture' })).toHaveLength(1);
    expect(publishWarnings({ ...base, type: 'notes' })).toHaveLength(1);
    expect(publishWarnings({ ...base, type: 'quiz', quizQuestionCount: 0 })).toHaveLength(1);
    expect(publishWarnings({ ...base, type: 'project', usesDefaultRubric: true })).toHaveLength(2);
    expect(publishWarnings({ ...base, type: 'external_test' })).toHaveLength(2);
    expect(
      publishWarnings({ ...base, type: 'external_test', externalUrl: 'http://x.io/t', assessmentCode: 'QT-1' })
    ).toHaveLength(1);
  });

  it('is quiet for ready items', () => {
    expect(publishWarnings({ ...base, type: 'lecture', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' })).toEqual([]);
    expect(publishWarnings({ ...base, type: 'resource', resourceLink: 'https://x.io' })).toEqual([]);
    expect(publishWarnings({ ...base, type: 'quiz', quizQuestionCount: 3 })).toEqual([]);
    expect(publishWarnings({ ...base, type: 'project', description: 'Build it', usesDefaultRubric: false })).toEqual([]);
    expect(
      publishWarnings({
        ...base,
        type: 'external_test',
        externalUrl: 'https://rms-careers.qwiktest.in/assessment-1',
        assessmentCode: 'QT-1'
      })
    ).toEqual([]);
  });
});

describe('student preview is inert', () => {
  // The preview mirrors student pages but must never complete, submit or start anything.
  const builderDir = path.resolve(__dirname, '../../app/(admin)/content/[id]');
  const previewFiles = [
    path.join(builderDir, 'student-preview.tsx'),
    ...readdirSync(path.join(builderDir, 'editors')).map((f) => path.join(builderDir, 'editors', f))
  ];

  it.each(previewFiles.map((f) => [path.relative(builderDir, f), f]))('%s imports no server actions', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const spec of imports) {
      expect(spec).not.toMatch(/(^|\/)actions$/);
      expect(spec).not.toMatch(/^@\/lib\/actions/);
      if (spec.startsWith('.')) {
        const base = path.resolve(path.dirname(file), spec);
        for (const candidate of [`${base}.ts`, `${base}.tsx`]) {
          try {
            expect(readFileSync(candidate, 'utf8')).not.toMatch(/^\s*['"]use server['"]/);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
          }
        }
      }
    }
  });
});
