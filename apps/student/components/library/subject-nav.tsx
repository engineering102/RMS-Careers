import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getLibrarySubject, librarySubjectHref } from '@/lib/data/library-subjects';
import type { LibraryCategoryType } from '@/lib/data/library-categories';

interface SubjectNavProps {
  /** Subjects that have items in the current scope, in display order. */
  counts: { subject: string; itemCount: number }[];
  /** Content type the links stay inside; omit for links across every type. */
  type?: LibraryCategoryType | null;
  activeSubject?: string | null;
  /** Show an "All" link that clears the subject. Off on the hub, where no listing is open yet. */
  showAll?: boolean;
  label?: string;
}

/** Subject links for My Library: each opens the listing narrowed to one subject. */
export function SubjectNav({
  counts,
  type = null,
  activeSubject = null,
  showAll = true,
  label = 'Browse by subject'
}: SubjectNavProps) {
  if (counts.length === 0) return null;

  const total = counts.reduce((sum, c) => sum + c.itemCount, 0);
  const pill = (active: boolean) =>
    cn(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active
        ? 'border-primary/40 bg-primary/10 text-primary'
        : 'border-border bg-card text-foreground/80 hover:border-input hover:text-foreground'
    );
  const count = (active: boolean) =>
    cn('tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground');

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {showAll && (
          <li>
            <Link
              href={librarySubjectHref({ type })}
              aria-current={activeSubject ? undefined : 'page'}
              className={pill(!activeSubject)}
            >
              All subjects
              <span className={count(!activeSubject)}>{total}</span>
            </Link>
          </li>
        )}
        {counts.map(({ subject, itemCount }) => {
          const active = subject === activeSubject;
          return (
            <li key={subject}>
              <Link
                href={librarySubjectHref({ type, subject })}
                aria-current={active ? 'page' : undefined}
                className={pill(active)}
              >
                {getLibrarySubject(subject)?.label ?? subject}
                <span className={count(active)}>{itemCount}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
