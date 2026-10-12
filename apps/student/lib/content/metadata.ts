// Normalises content_items.metadata into what the content player renders.
// Pure (no DB access) so the key mapping can be unit tested.
import type { ContentItemMetadata } from '@/lib/types/library';
import type { VideoMetadata, ResourceMetadata } from '@/lib/types/content';
import { parseVideoUrl } from './video-url';

function firstString(...values: unknown[]): string | undefined {
  return values.find((v): v is string => typeof v === 'string' && v.trim() !== '');
}

/**
 * Extracts normalized VideoMetadata from content item metadata.
 */
export function extractVideoMetadata(metadata: ContentItemMetadata): VideoMetadata | null {
  let providerRaw = typeof metadata.provider === 'string' ? metadata.provider.toLowerCase() : '';
  let videoId = typeof metadata.videoId === 'string' ? metadata.videoId.trim() : '';

  // Content saved by older admin forms only has a pasted link under `videoUrl`.
  if (!videoId && !providerRaw && typeof metadata.videoUrl === 'string') {
    const parsed = parseVideoUrl(metadata.videoUrl);
    if (parsed) {
      providerRaw = parsed.provider;
      videoId = parsed.videoId;
    }
  }

  if (!videoId && !providerRaw) {
    return null;
  }

  let provider: 'vimeo' | 'youtube' | 'custom' = 'custom';
  if (providerRaw.includes('vimeo')) {
    provider = 'vimeo';
  } else if (providerRaw.includes('youtube')) {
    provider = 'youtube';
  }

  const durationMinutes =
    typeof metadata.durationMinutes === 'number'
      ? metadata.durationMinutes
      : typeof metadata.duration === 'number'
        ? metadata.duration
        : undefined;

  const durationSeconds =
    typeof metadata.durationSeconds === 'number'
      ? metadata.durationSeconds
      : durationMinutes !== undefined
        ? durationMinutes * 60
        : undefined;

  const aspectRatio =
    metadata.aspectRatio === '4:3' || metadata.aspectRatio === '16:9'
      ? metadata.aspectRatio
      : '16:9';

  return {
    provider,
    videoId,
    aspectRatio,
    durationMinutes,
    durationSeconds
  };
}

/**
 * Extracts normalized ResourceMetadata from content item metadata.
 */
export function extractResourceMetadata(metadata: ContentItemMetadata): ResourceMetadata | null {
  // `resourceLink` and `notesMarkdown` are the keys older admin forms saved.
  const documentUrl = firstString(metadata.documentUrl, metadata.url, metadata.resourceLink);
  const notes = firstString(metadata.notes, metadata.notesMarkdown);
  const topic = typeof metadata.topic === 'string' ? metadata.topic : undefined;
  const category = typeof metadata.category === 'string' ? metadata.category : undefined;
  const fileType = typeof metadata.fileType === 'string' ? metadata.fileType : undefined;

  if (!documentUrl && !notes && !topic && !category) {
    return null;
  }

  return {
    documentUrl,
    notes,
    topic,
    category,
    fileType
  };
}
