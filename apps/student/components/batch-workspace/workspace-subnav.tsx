import React from 'react';
import Link from 'next/link';
import { Calendar, ClipboardCheck, Trophy, Megaphone, Video } from 'lucide-react';

interface WorkspaceSubnavProps {
  batchId: string;
  activeTab?: string;
}

export function WorkspaceSubnav({ batchId, activeTab = 'curriculum' }: WorkspaceSubnavProps) {
  const tabs = [
    { id: 'curriculum', label: 'Curriculum Timeline', icon: Calendar, href: `/batches/${batchId}` },
    { id: 'live', label: 'Live Lectures', icon: Video, href: `/batches/${batchId}/live` },
    { id: 'assessments', label: 'Batch Assessments', icon: ClipboardCheck, href: null },
    { id: 'leaderboard', label: 'Cohort Leaderboard', icon: Trophy, href: null },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, href: null }
  ];

  // Sections that have not shipped (no href) are not shown ("decide what not to build"). With a single live section
  // there is nothing to switch between, so it is shown as a heading instead of a one-item tab bar.
  const liveTabs = tabs.filter((tab): tab is (typeof tabs)[number] & { href: string } => tab.href !== null);
  if (liveTabs.length === 1) {
    const [only] = liveTabs;
    const Icon = only.icon;
    return (
      <h2 className="flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {only.label}
      </h2>
    );
  }

  return (
    <nav aria-label="Batch workspace" className="flex items-center gap-2 overflow-x-auto border-b border-border pb-1 scrollbar-none">
      {liveTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-t-lg px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? 'border-b-2 border-primary bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
