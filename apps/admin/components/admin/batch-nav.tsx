import Link from 'next/link';
import { cn } from '@/lib/utils';

export type BatchSection =
  | 'overview'
  | 'curriculum'
  | 'assessments'
  | 'projects'
  | 'external-assessments'
  | 'live-lectures'
  | 'analytics';

export const BATCH_SECTIONS: { id: BatchSection; label: string; path: string }[] = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'curriculum', label: 'Curriculum', path: '/curriculum' },
  { id: 'assessments', label: 'Assessments', path: '/assessments' },
  { id: 'projects', label: 'Projects', path: '/projects' },
  { id: 'external-assessments', label: 'External', path: '/external-assessments' },
  { id: 'live-lectures', label: 'Live Lectures', path: '/live-lectures' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' }
];

export function batchSectionHref(batchId: string, section: BatchSection): string {
  const entry = BATCH_SECTIONS.find((s) => s.id === section);
  return `/batches/${batchId}${entry?.path ?? ''}`;
}

/** The same section links on every /batches/[batchId] page; each section is its own route. */
export function BatchNav({ batchId, active }: { batchId: string; active: BatchSection }) {
  return (
    <nav aria-label="Batch sections" className="-mx-1 overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1 px-1">
        {BATCH_SECTIONS.map((section) => {
          const isActive = section.id === active;
          return (
            <li key={section.id}>
              <Link
                href={batchSectionHref(batchId, section.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
