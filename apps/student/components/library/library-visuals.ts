import type { CSSProperties } from 'react';
import {
  Binary,
  Bookmark,
  Boxes,
  Braces,
  Briefcase,
  Calculator,
  Code2,
  Cpu,
  FileText,
  FolderGit2,
  Globe,
  HelpCircle,
  Shapes,
  Terminal,
  Video,
  type LucideIcon
} from 'lucide-react';
import type { LibraryContentType } from '@/lib/types/library';

/** Each format is told apart by its icon and by the shape of its card, not by colour. */
export const FORMAT_ICONS: Record<LibraryContentType, LucideIcon> = {
  lecture: Video,
  notes: FileText,
  dsa_sheet: Code2,
  quiz: HelpCircle,
  project: FolderGit2,
  resource: Bookmark
};

interface SubjectVisual {
  icon: LucideIcon;
  /** Hue and saturation of the subject's tone ("H S%"), used only for decoration (icon tile, card edge). */
  tone: string;
}

const SUBJECT_VISUALS: Record<string, SubjectVisual> = {
  'programming-fundamentals': { icon: Braces, tone: '258 70%' },
  dsa: { icon: Binary, tone: '160 64%' },
  'system-design': { icon: Boxes, tone: '214 78%' },
  'core-cs': { icon: Cpu, tone: '22 82%' },
  'web-development': { icon: Globe, tone: '190 76%' },
  'dev-tools': { icon: Terminal, tone: '338 70%' },
  aptitude: { icon: Calculator, tone: '42 84%' },
  career: { icon: Briefcase, tone: '282 56%' },
  general: { icon: Shapes, tone: '240 6%' }
};

export function subjectVisual(slug: string): SubjectVisual {
  return SUBJECT_VISUALS[slug] ?? SUBJECT_VISUALS.general;
}

/**
 * Exposes the subject's tone as --tone for the classes below. A mid lightness reads on both light and dark
 * surfaces, so no per-theme variant is needed. The tone never carries meaning on its own: the subject is always
 * named in text beside it.
 */
export function subjectToneStyle(slug: string): CSSProperties {
  return { '--tone': subjectVisual(slug).tone } as CSSProperties;
}

/** Tinted tile with the icon in the subject's tone. Needs --tone on this element or an ancestor. */
export const TONE_TILE = 'bg-[hsl(var(--tone)_50%/0.13)] text-[hsl(var(--tone)_46%)]';
