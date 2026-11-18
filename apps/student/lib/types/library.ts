export type ContentType =
  | 'lecture'
  | 'notes'
  | 'dsa_sheet'
  | 'quiz'
  | 'project'
  | 'resource'
  | 'external_test';

export interface ContentItemMetadata {
  topic?: string;
  category?: string;
  /** Subject slug picked by an admin (see @rms/db/content-subjects); absent on untagged content. */
  subject?: string | null;
  durationMinutes?: number;
  provider?: string;
  videoId?: string;
  documentUrl?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  [key: string]: unknown;
}

/** Content types students browse in the Library (external tests live on Assessments). */
export type LibraryContentType = Exclude<ContentType, 'external_test'>;

export type LibraryDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * One Library entry as sent to the browser. Deliberately slim: the whole accessible catalog is loaded once and
 * browsed client-side, so it carries only what a card shows (never the notes body or other metadata).
 */
export interface LibraryCatalogItem {
  id: string;
  title: string;
  slug: string;
  contentType: LibraryContentType;
  /** Shortened to a card-sized excerpt by the query. */
  description: string | null;
  topic: string | null;
  /** Resolved subject slug: the admin's pick, else inferred from topic and title, else 'general'. */
  subject: string;
  durationMinutes: number | null;
  difficulty: LibraryDifficulty | null;
  programCode: string;
  /** Lecture still (YouTube only, see videoThumbnailUrl); null for other formats and other video hosts. */
  thumbnailUrl: string | null;
}
