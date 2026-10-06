import type { ContentType, ContentItemMetadata } from './library';

export interface VideoMetadata {
  provider: 'vimeo' | 'youtube' | 'custom';
  videoId: string;
  aspectRatio?: '16:9' | '4:3';
  durationMinutes?: number;
  durationSeconds?: number;
}

export interface ResourceMetadata {
  documentUrl?: string;
  notes?: string;
  topic?: string;
  category?: string;
  fileType?: string;
}

export interface RelatedBatchContext {
  batchId: string;
  batchName: string;
}

export interface ContentPlayerItem {
  id: string;
  programId: number | null;
  programName: string;
  programCode: string;
  title: string;
  slug: string;
  contentType: ContentType;
  description: string | null;
  metadata: ContentItemMetadata;
  isPublished: boolean;
  isCompleted: boolean;
  completedAt: Date | null;
  videoMetadata: VideoMetadata | null;
  resourceMetadata: ResourceMetadata | null;
  relatedBatchContext: RelatedBatchContext | null;
}
