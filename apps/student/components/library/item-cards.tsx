import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLibrarySubject, libraryItemHref } from '@/lib/library/browse';
import type { LibraryCatalogItem, LibraryContentType } from '@/lib/types/library';
import { FORMAT_ICONS, subjectToneStyle, TONE_TILE } from './library-visuals';

// One card shape per format, so a shelf reads at a glance: lectures look like something to watch, notes like a
// page to read, practice like a task to start, resources like a list of links.

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const DIFFICULTY: Record<string, { label: string; level: number }> = {
  beginner: { label: 'Beginner', level: 1 },
  intermediate: { label: 'Intermediate', level: 2 },
  advanced: { label: 'Advanced', level: 3 }
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "Arrays & Hashing · CRP": the topic (or, without one, the subject) and the programme it belongs to. */
function Context({ item, className }: { item: LibraryCatalogItem; className?: string }) {
  const lead = item.topic ?? getLibrarySubject(item.subject)?.label;
  return (
    <p className={cn('truncate text-xs text-muted-foreground', className)}>
      {lead}
      {lead && <span aria-hidden="true"> · </span>}
      {item.programCode}
    </p>
  );
}

function DifficultyBars({ difficulty }: { difficulty: NonNullable<LibraryCatalogItem['difficulty']> }) {
  const { label, level } = DIFFICULTY[difficulty];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3].map((l) => (
          <span
            key={l}
            className={cn('w-[3px] rounded-sm', l <= level ? 'bg-foreground' : 'bg-border-strong')}
            style={{ height: `${4 + l * 3}px` }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

/** Lecture: a 16:9 screen with a play control and the running time, then the title. */
export function LectureCard({ item }: { item: LibraryCatalogItem }) {
  return (
    <Link
      href={libraryItemHref(item)}
      style={subjectToneStyle(item.subject)}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color,transform] duration-150 hover:border-border-strong active:scale-[0.99] motion-reduce:transform-none',
        FOCUS
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-[hsl(var(--tone)_50%/0.10)]">
        {/* Faint ruled backdrop in the subject's tone, standing in for a thumbnail. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, hsl(var(--tone) 50% / 0.16) 0 1px, transparent 1px 14px)'
          }}
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-transform duration-150 group-hover:scale-110 motion-reduce:transform-none"
        >
          <Play className="h-4 w-4 translate-x-px fill-current" />
        </span>
        {item.topic && (
          <span className="absolute left-2 top-2 max-w-[70%] truncate rounded bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
            {item.topic}
          </span>
        )}
        {item.durationMinutes && (
          <span className="tabular absolute bottom-2 right-2 rounded bg-background/90 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
            {formatDuration(item.durationMinutes)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-sm font-medium text-foreground">
          Watch lecture
          <ArrowRight
            className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

/** Notes: a sheet of paper beside the title and a two-line excerpt. */
export function NotesCard({ item }: { item: LibraryCatalogItem }) {
  return (
    <Link
      href={libraryItemHref(item)}
      style={subjectToneStyle(item.subject)}
      className={cn(
        'group flex gap-4 rounded-lg border border-border bg-card p-4 transition-[border-color,transform] duration-150 hover:border-border-strong active:scale-[0.99] motion-reduce:transform-none',
        FOCUS
      )}
    >
      <span
        aria-hidden="true"
        className="relative mt-0.5 flex h-[68px] w-[52px] shrink-0 flex-col gap-[5px] rounded-[3px] border border-border-strong bg-background px-2 pt-3 transition-transform duration-150 group-hover:-rotate-2 motion-reduce:transform-none"
      >
        <span className="h-[3px] w-4/5 rounded-full bg-[hsl(var(--tone)_48%)]" />
        <span className="h-px w-full bg-border-strong" />
        <span className="h-px w-full bg-border-strong" />
        <span className="h-px w-3/4 bg-border-strong" />
        <span className="h-px w-full bg-border-strong" />
        <span className="h-px w-1/2 bg-border-strong" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <Context item={item} className="min-w-0" />
          {item.durationMinutes && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDuration(item.durationMinutes)} read
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const PRACTICE_ACTION: Partial<Record<LibraryContentType, { eyebrow: string; action: string }>> = {
  dsa_sheet: { eyebrow: 'Problem sheet', action: 'Open sheet' },
  quiz: { eyebrow: 'Quiz', action: 'Go to quiz' },
  project: { eyebrow: 'Project', action: 'View project' }
};

/** Sheets, quizzes and projects: a task card with a labelled edge and an explicit action. */
export function PracticeCard({ item }: { item: LibraryCatalogItem }) {
  const Icon = FORMAT_ICONS[item.contentType];
  const copy = PRACTICE_ACTION[item.contentType] ?? { eyebrow: 'Practice', action: 'Open' };
  return (
    <Link
      href={libraryItemHref(item)}
      style={subjectToneStyle(item.subject)}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-5 pl-6 transition-[border-color,transform] duration-150 hover:border-border-strong active:scale-[0.99] motion-reduce:transform-none',
        FOCUS
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[hsl(var(--tone)_48%)]" />
      <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        {copy.eyebrow}
      </div>
      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
        {item.title}
      </h3>
      {item.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
        <Context item={item} className="min-w-0" />
        {item.difficulty && <DifficultyBars difficulty={item.difficulty} />}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm font-medium text-foreground">
        {copy.action}
        <ArrowRight
          className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

/** Resource: one row in a list of links. */
export function ResourceRow({ item }: { item: LibraryCatalogItem }) {
  const Icon = FORMAT_ICONS.resource;
  return (
    <Link
      href={libraryItemHref(item)}
      style={subjectToneStyle(item.subject)}
      className={cn(
        'group flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60',
        FOCUS,
        'focus-visible:ring-inset focus-visible:ring-offset-0'
      )}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', TONE_TILE)} aria-hidden="true">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-medium leading-snug text-foreground">{item.title}</h3>
        <p className="truncate text-sm text-muted-foreground">
          {item.description ?? item.topic ?? getLibrarySubject(item.subject)?.label}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{item.programCode}</span>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}

/** A format's items laid out the way that format reads best. */
export function FormatItems({ type, items }: { type: LibraryContentType; items: LibraryCatalogItem[] }) {
  if (type === 'resource') {
    return (
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <ResourceRow item={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (type === 'notes') {
    return (
      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0 [&>a]:w-full [&>a]:min-w-0">
            <NotesCard item={item} />
          </li>
        ))}
      </ul>
    );
  }
  const Card = type === 'lecture' ? LectureCard : PracticeCard;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="flex min-w-0 [&>a]:w-full [&>a]:min-w-0">
          <Card item={item} />
        </li>
      ))}
    </ul>
  );
}
