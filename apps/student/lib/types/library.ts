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

export interface LibraryItem {
  id: string;
  programId: number | null;
  programName: string;
  programCode: string;
  title: string;
  slug: string;
  contentType: ContentType;
  description: string | null;
  metadata: ContentItemMetadata;
  topic: string;
  /** Resolved subject slug: the admin's pick, else inferred from topic and title, else 'general'. */
  subject: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryFilterParams {
  query?: string;
  contentType?: ContentType | 'all';
  topic?: string;
  /** Subject slug, or 'all'. */
  subject?: string;
  /** Order results by subject (in display order) before recency, so a page can show subject headings. */
  groupBySubject?: boolean;
  page?: number;
  limit?: number;
}

export interface LibraryQueryResult {
  items: LibraryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  availableTopics: string[];
  availableContentTypes: ContentType[];
}
