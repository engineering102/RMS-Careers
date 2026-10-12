import { describe, it, expect } from 'vitest';
import { extractResourceMetadata, extractVideoMetadata } from '../content/metadata';

describe('content metadata (what the player renders)', () => {
  it('uses provider + videoId when present', () => {
    expect(extractVideoMetadata({ provider: 'YouTube', videoId: 'dQw4w9WgXcQ', durationMinutes: 10 })).toMatchObject({
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      durationMinutes: 10,
      durationSeconds: 600,
      aspectRatio: '16:9'
    });
  });

  it('plays lectures saved by the old admin form, which only stored a pasted videoUrl', () => {
    expect(extractVideoMetadata({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toMatchObject({
      provider: 'youtube',
      videoId: 'dQw4w9WgXcQ'
    });
    expect(extractVideoMetadata({ videoUrl: 'https://vimeo.com/76979871' })).toMatchObject({
      provider: 'vimeo',
      videoId: '76979871'
    });
  });

  it('ignores an unplayable legacy link', () => {
    expect(extractVideoMetadata({ videoUrl: 'javascript:alert(1)' })).toBeNull();
    expect(extractVideoMetadata({})).toBeNull();
  });

  it('shows documents and notes saved under the old admin keys', () => {
    expect(extractResourceMetadata({ resourceLink: 'https://docs.google.com/x', notesMarkdown: 'Read this' })).toMatchObject({
      documentUrl: 'https://docs.google.com/x',
      notes: 'Read this'
    });
  });

  it('prefers the current keys over the legacy ones', () => {
    expect(
      extractResourceMetadata({ documentUrl: 'https://new', resourceLink: 'https://old', notes: 'new', notesMarkdown: 'old' })
    ).toMatchObject({ documentUrl: 'https://new', notes: 'new' });
  });
});
