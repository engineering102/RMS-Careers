import {
  Bookmark,
  Code2,
  ExternalLink,
  FileText,
  FolderGit2,
  ListChecks,
  Video,
  type LucideIcon
} from 'lucide-react';
import type { ContentType } from '@/lib/types/library';

/**
 * One definition of how each content type is named and drawn, everywhere in the portal (curriculum rows, the
 * lesson header, library cards, deadlines, "up next"). Before the redesign each of those kept its own copy with its
 * own colours, and they had drifted apart.
 *
 * Types are told apart by icon and label, not colour: colour is reserved for state (solved, due soon, overdue), so
 * a quiz that is overdue reads as overdue rather than as "purple".
 */
export interface ContentTypeMeta {
  /** Short noun for tags and filters, sentence case. */
  label: string;
  icon: LucideIcon;
}

export const CONTENT_TYPES: Record<ContentType, ContentTypeMeta> = {
  lecture: { label: 'Lecture', icon: Video },
  notes: { label: 'Notes', icon: FileText },
  dsa_sheet: { label: 'DSA practice', icon: Code2 },
  quiz: { label: 'Quiz', icon: ListChecks },
  project: { label: 'Project', icon: FolderGit2 },
  resource: { label: 'Resource', icon: Bookmark },
  external_test: { label: 'External test', icon: ExternalLink }
};

/** Metadata for a content type, falling back to "Resource" for anything unknown. */
export function contentTypeMeta(type: string | null | undefined): ContentTypeMeta {
  return CONTENT_TYPES[(type ?? '') as ContentType] ?? CONTENT_TYPES.resource;
}
