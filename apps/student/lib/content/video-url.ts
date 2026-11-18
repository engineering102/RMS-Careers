// Turns a pasted video link into the { provider, videoId } pair the student portal's player reads.
// Keep in sync with apps/admin/lib/content/video-url.ts (each app is deployed separately).

export type VideoProvider = 'youtube' | 'vimeo' | 'custom';

export interface ParsedVideo {
  provider: VideoProvider;
  /** YouTube/Vimeo id, or the full https URL for any other embeddable player. */
  videoId: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

function safeUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** Returns null for anything that is not an http(s) URL. Non YouTube/Vimeo links must be https. */
export function parseVideoUrl(raw: string | null | undefined): ParsedVideo | null {
  if (!raw || !raw.trim()) return null;
  const url = safeUrl(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '');
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    const id = segments[0] ?? '';
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null;
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const fromQuery = url.searchParams.get('v') ?? '';
    if (YOUTUBE_ID.test(fromQuery)) return { provider: 'youtube', videoId: fromQuery };
    const [kind, id = ''] = segments;
    if (['embed', 'shorts', 'live', 'v'].includes(kind ?? '') && YOUTUBE_ID.test(id)) {
      return { provider: 'youtube', videoId: id };
    }
    return null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = segments.find((s) => VIMEO_ID.test(s));
    return id ? { provider: 'vimeo', videoId: id } : null;
  }

  if (url.protocol !== 'https:') return null;
  return { provider: 'custom', videoId: url.toString() };
}

/** The iframe URL the student portal uses for this video. */
export function embedUrlFor(video: ParsedVideo): string {
  if (video.provider === 'vimeo') {
    return `https://player.vimeo.com/video/${video.videoId}?autoplay=0&title=0&byline=0&portrait=0&badge=0`;
  }
  if (video.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1`;
  }
  return video.videoId;
}

/**
 * A still image for a lecture card, or null when none can be derived without a network call. Only YouTube serves
 * thumbnails at a predictable URL (hqdefault exists for every public video); Vimeo needs an API lookup and custom
 * players have no convention, so those cards keep their drawn placeholder. The host must be allowed by img-src in
 * security-headers.ts.
 */
export function videoThumbnailUrl(video: { provider: string; videoId: string } | null): string | null {
  if (!video?.videoId) return null;
  let id: string | null = null;
  if (YOUTUBE_ID.test(video.videoId) && video.provider !== 'vimeo') {
    // youtube, or a bare id saved under a custom provider (the player embeds those from YouTube too)
    id = video.videoId;
  } else if (video.provider === 'custom') {
    const parsed = parseVideoUrl(video.videoId);
    if (parsed?.provider === 'youtube') id = parsed.videoId;
  }
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
