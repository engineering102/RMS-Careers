import { describe, it, expect } from 'vitest';
import { embedUrlFor, parseVideoUrl } from '../content/video-url';
import { buildStudentMetadataPatch, InvalidVideoUrlError, readAuthoringFields } from '../content/student-metadata';
import { DEFAULT_PROJECT_RUBRIC, projectRubricSchema, rubricMaxScore } from '../content/project-rubric';
import { contentBuilderSchema } from '../../app/(admin)/content/[id]/schema';
import { describeAudience } from '../content/audience';

describe('parseVideoUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  https://youtu.be/dQw4w9WgXcQ  ', 'dQw4w9WgXcQ']
  ])('reads the YouTube id from %s', (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'youtube', videoId: id });
  });

  it.each([
    ['https://vimeo.com/76979871', '76979871'],
    ['https://vimeo.com/channels/staffpicks/76979871', '76979871'],
    ['https://player.vimeo.com/video/76979871?h=abc', '76979871']
  ])('reads the Vimeo id from %s', (url, id) => {
    expect(parseVideoUrl(url)).toEqual({ provider: 'vimeo', videoId: id });
  });

  it('keeps other https players as a custom embed URL', () => {
    expect(parseVideoUrl('https://www.loom.com/embed/abc123')).toEqual({
      provider: 'custom',
      videoId: 'https://www.loom.com/embed/abc123'
    });
  });

  it.each([
    '',
    'not a url',
    'javascript:alert(1)',
    'http://example.com/video',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/UC123',
    'https://vimeo.com/about'
  ])('rejects %j', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });

  it('builds the same embed URLs as the student player', () => {
    expect(embedUrlFor({ provider: 'youtube', videoId: 'dQw4w9WgXcQ' })).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'
    );
    expect(embedUrlFor({ provider: 'vimeo', videoId: '76979871' })).toMatch(/^https:\/\/player\.vimeo\.com\/video\/76979871\?/);
  });
});

describe('buildStudentMetadataPatch (admin input -> keys the student portal reads)', () => {
  it('stores a pasted video link as provider + videoId, keeping the link for admin screens', () => {
    expect(buildStudentMetadataPatch({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ' })).toEqual({
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ'
    });
  });

  it('rejects a video link students could not play', () => {
    expect(() => buildStudentMetadataPatch({ videoUrl: 'https://www.youtube.com/channel/UC123' })).toThrow(
      InvalidVideoUrlError
    );
  });

  it('writes resource links and notes under the student keys too', () => {
    expect(buildStudentMetadataPatch({ resourceLink: ' https://docs.google.com/x ', notes: 'Line 1\n  indented\n\n' })).toEqual({
      resourceLink: 'https://docs.google.com/x',
      documentUrl: 'https://docs.google.com/x',
      notes: 'Line 1\n  indented',
      notesMarkdown: 'Line 1\n  indented'
    });
  });

  it('clears values when fields are emptied and leaves untouched fields out', () => {
    expect(buildStudentMetadataPatch({ videoUrl: '', notes: '   ', topic: '' })).toEqual({
      topic: null,
      videoUrl: null,
      provider: null,
      videoId: null,
      notes: null,
      notesMarkdown: null
    });
    expect(buildStudentMetadataPatch({})).toEqual({});
  });

  it('reads stored values back, preferring the student keys and rebuilding links for seeded videos', () => {
    expect(readAuthoringFields({ provider: 'youtube', videoId: 'dQw4w9WgXcQ', durationMinutes: 12 })).toMatchObject({
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationMinutes: 12
    });
    expect(readAuthoringFields({ resourceLink: 'https://old', notesMarkdown: 'old notes' })).toMatchObject({
      resourceLink: 'https://old',
      notes: 'old notes'
    });
    expect(readAuthoringFields({ documentUrl: 'https://new', resourceLink: 'https://old' }).resourceLink).toBe('https://new');
    expect(readAuthoringFields(null)).toMatchObject({ videoUrl: '', notes: '', durationMinutes: null });
  });
});

describe('project rubric', () => {
  it('derives the max score from the criteria', () => {
    expect(rubricMaxScore(DEFAULT_PROJECT_RUBRIC)).toBe(100);
  });

  it('validates criteria', () => {
    expect(projectRubricSchema.safeParse([]).success).toBe(false);
    expect(projectRubricSchema.safeParse([{ title: 'X', maxPoints: 10 }]).success).toBe(false);
    expect(projectRubricSchema.safeParse([{ title: 'Tests', maxPoints: 0 }]).success).toBe(false);
    expect(projectRubricSchema.safeParse([{ title: 'Tests', maxPoints: 2.5 }]).success).toBe(false);
    const ok = projectRubricSchema.safeParse([{ title: ' Tests ', maxPoints: '25' }]);
    expect(ok.success && ok.data).toEqual([{ title: 'Tests', maxPoints: 25, description: '' }]);
  });
});

describe('content builder schema', () => {
  const base = {
    id: '11111111-1111-4111-8111-111111111111',
    contentType: 'notes' as const,
    title: 'Two pointers',
    slug: 'two-pointers',
    programId: null,
    durationMinutes: null
  };

  it('accepts a minimal item and defaults optional text to empty', () => {
    const parsed = contentBuilderSchema.safeParse(base);
    expect(parsed.success && parsed.data).toMatchObject({ description: '', notes: '', resourceLink: '' });
  });

  it('rejects bad slugs, non-http resource links and negative durations', () => {
    expect(contentBuilderSchema.safeParse({ ...base, slug: 'Two Pointers' }).success).toBe(false);
    expect(contentBuilderSchema.safeParse({ ...base, resourceLink: 'ftp://x' }).success).toBe(false);
    expect(contentBuilderSchema.safeParse({ ...base, durationMinutes: -5 }).success).toBe(false);
  });

  it('keeps only the fields that belong to the item type', () => {
    const parsed = contentBuilderSchema.safeParse({ ...base, contentType: 'quiz', notes: 'stray', videoUrl: 'x' });
    expect(parsed.success && parsed.data).not.toHaveProperty('notes');
    expect(parsed.success && parsed.data).not.toHaveProperty('videoUrl');
  });

  it('requires a rubric for projects, keyed so the builder can mark the field', () => {
    const parsed = contentBuilderSchema.safeParse({ ...base, contentType: 'project' });
    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0].path).toEqual(['rubric']);
  });

  it('rejects unknown content types', () => {
    expect(contentBuilderSchema.safeParse({ ...base, contentType: 'webinar' }).success).toBe(false);
  });
});

describe('describeAudience (who can open the item in the student portal)', () => {
  const programs = [{ id: 7, code: 'CSE-26', name: 'B.Tech CSE' }];
  it('explains drafts, archived and unplaced global items', () => {
    expect(describeAudience({ lifecycleStatus: 'draft', programId: null, batchUsageCount: 0 }, programs)).toBe(
      'Students see it once published'
    );
    expect(describeAudience({ lifecycleStatus: 'archived', programId: 7, batchUsageCount: 2 }, programs)).toBe(
      'Archived: hidden from students'
    );
    expect(describeAudience({ lifecycleStatus: 'published', programId: null, batchUsageCount: 0 }, programs)).toBe(
      'Not visible to students yet: add it to a batch curriculum'
    );
  });

  it('names the program and batch placements for published items', () => {
    expect(describeAudience({ lifecycleStatus: 'published', programId: 7, batchUsageCount: 0 }, programs)).toBe(
      'Visible to every student in CSE-26'
    );
    expect(describeAudience({ lifecycleStatus: 'published', programId: null, batchUsageCount: 1 }, programs)).toBe(
      'Visible to students in 1 batch curriculum'
    );
  });
});
