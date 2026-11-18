import { describe, expect, it } from 'vitest';
import { videoThumbnailUrl } from '@/lib/content/video-url';

const YT = 'dQw4w9WgXcQ';
const STILL = `https://i.ytimg.com/vi/${YT}/hqdefault.jpg`;

describe('videoThumbnailUrl', () => {
  it('builds the YouTube still for a youtube video id', () => {
    expect(videoThumbnailUrl({ provider: 'youtube', videoId: YT })).toBe(STILL);
  });

  it('uses a bare YouTube id saved under a custom provider (the player embeds it from YouTube)', () => {
    expect(videoThumbnailUrl({ provider: 'custom', videoId: YT })).toBe(STILL);
  });

  it('reads the id out of a YouTube URL saved as a custom embed', () => {
    expect(videoThumbnailUrl({ provider: 'custom', videoId: `https://www.youtube-nocookie.com/embed/${YT}` })).toBe(
      STILL
    );
  });

  it('returns null for Vimeo, other hosts and missing videos', () => {
    expect(videoThumbnailUrl({ provider: 'vimeo', videoId: '76979871' })).toBeNull();
    expect(videoThumbnailUrl({ provider: 'custom', videoId: 'https://player.example.com/v/42' })).toBeNull();
    expect(videoThumbnailUrl({ provider: 'youtube', videoId: '' })).toBeNull();
    expect(videoThumbnailUrl(null)).toBeNull();
  });

  it('never builds a URL from an id that is not a YouTube id', () => {
    expect(videoThumbnailUrl({ provider: 'youtube', videoId: '../../evil' })).toBeNull();
  });
});
