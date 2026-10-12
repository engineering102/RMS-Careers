// Maps what admins type into content_items.metadata keys the student portal actually reads.
//
// The student content player reads:
//   lecture:          provider, videoId, durationMinutes, aspectRatio
//   notes / resource: documentUrl, notes, topic, category, fileType
// Older admin forms saved videoUrl / resourceLink / notesMarkdown instead, which students never saw.
// Those legacy keys are still written so existing admin screens keep showing the values.
import { parseVideoUrl } from './video-url';

export interface AuthoringFields {
  topic?: string | null;
  videoUrl?: string | null;
  resourceLink?: string | null;
  notes?: string | null;
  durationMinutes?: number | null;
}

type MetadataPatch = Record<string, unknown>;

const blankToNull = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Builds a metadata patch for updateContentItem (which merges into the existing metadata).
 * Fields left undefined are untouched; empty strings clear the value (stored as null).
 * Throws if a video link is given that cannot be embedded.
 */
export function buildStudentMetadataPatch(fields: AuthoringFields): MetadataPatch {
  const patch: MetadataPatch = {};

  const topic = blankToNull(fields.topic);
  if (topic !== undefined) patch.topic = topic;

  const videoUrl = blankToNull(fields.videoUrl);
  if (videoUrl !== undefined) {
    if (videoUrl === null) {
      patch.videoUrl = null;
      patch.provider = null;
      patch.videoId = null;
    } else {
      const parsed = parseVideoUrl(videoUrl);
      if (!parsed) {
        throw new InvalidVideoUrlError();
      }
      patch.videoUrl = videoUrl;
      patch.provider = parsed.provider;
      patch.videoId = parsed.videoId;
    }
  }

  const resourceLink = blankToNull(fields.resourceLink);
  if (resourceLink !== undefined) {
    patch.resourceLink = resourceLink;
    patch.documentUrl = resourceLink;
  }

  if (fields.notes !== undefined) {
    // Notes keep their own whitespace (students see line breaks as typed); only all-blank clears them.
    const notes = fields.notes && fields.notes.trim() ? fields.notes.replace(/\s+$/, '') : null;
    patch.notes = notes;
    patch.notesMarkdown = notes;
  }

  if (fields.durationMinutes !== undefined) patch.durationMinutes = fields.durationMinutes;

  return patch;
}

export class InvalidVideoUrlError extends Error {
  constructor() {
    super('Video link must be a YouTube or Vimeo link, or an https embed URL.');
    this.name = 'InvalidVideoUrlError';
  }
}

/** A shareable link for content seeded with only provider + videoId. */
function videoLinkFromId(provider: string, videoId: string): string {
  if (!videoId) return '';
  const p = provider.toLowerCase();
  if (p.includes('youtube')) return `https://www.youtube.com/watch?v=${videoId}`;
  if (p.includes('vimeo')) return `https://vimeo.com/${videoId}`;
  return videoId.startsWith('https://') ? videoId : '';
}

/** Reads authoring values back out of stored metadata, preferring the keys students read. */
export function readAuthoringFields(metadata: Record<string, unknown> | null | undefined) {
  const m = metadata ?? {};
  const str = (key: string) => (typeof m[key] === 'string' ? (m[key] as string) : '');
  return {
    topic: str('topic'),
    videoUrl: str('videoUrl') || videoLinkFromId(str('provider'), str('videoId')),
    provider: str('provider'),
    videoId: str('videoId'),
    resourceLink: str('documentUrl') || str('url') || str('resourceLink'),
    notes: str('notes') || str('notesMarkdown'),
    durationMinutes:
      typeof m.durationMinutes === 'number' ? m.durationMinutes : typeof m.duration === 'number' ? m.duration : null
  };
}
