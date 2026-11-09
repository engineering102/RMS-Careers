import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface WorkspaceSubnavProps {
  batchId: string;
  activeTab?: string;
}

interface WorkspaceTab {
  id: string;
  label: string;
  /** null = not shipped yet; unshipped sections are not shown as disabled "coming soon" tabs. */
  href: ((batchId: string) => string) | null;
}

const TABS: WorkspaceTab[] = [
  { id: 'curriculum', label: 'Curriculum Timeline', href: (id) => `/batches/${id}` },
  { id: 'live', label: 'Live Lectures', href: (id) => `/batches/${id}/live` },
  { id: 'announcements', label: 'Announcements', href: null }
];

/**
 * Sections inside a batch, as underline tabs. With a single shipped section there is nothing to switch between,
 * so nothing renders.
 */
export function WorkspaceSubnav({ batchId, activeTab = 'curriculum' }: WorkspaceSubnavProps) {
  const liveTabs = TABS.filter((t): t is WorkspaceTab & { href: (id: string) => string } => t.href !== null);
  if (liveTabs.length < 2) return null;

  return (
    <nav aria-label="Batch workspace" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border">
      {liveTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href(batchId)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px flex min-h-[44px] shrink-0 items-center border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              active ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
