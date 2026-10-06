export type ContentType =
  | 'lecture'
  | 'notes'
  | 'dsa_sheet'
  | 'quiz'
  | 'project'
  | 'resource';

export interface ContentItemMetadata {
  topic?: string;
  category?: string;
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
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryFilterParams {
  query?: string;
  contentType?: ContentType | 'all';
  topic?: string;
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
