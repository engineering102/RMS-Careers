import React from 'react';
import { Calendar, ClipboardCheck, Trophy, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkspaceSubnavProps {
  batchId: string;
  activeTab?: string;
}

export function WorkspaceSubnav({ batchId, activeTab = 'curriculum' }: WorkspaceSubnavProps) {
  const tabs = [
    {
      id: 'curriculum',
      label: 'Curriculum Timeline',
      icon: Calendar,
      isActive: activeTab === 'curriculum'
    },
    {
      id: 'assessments',
      label: 'Batch Assessments',
      icon: ClipboardCheck,
      badge: 'Coming Soon',
      isActive: false
    },
    {
      id: 'leaderboard',
      label: 'Cohort Leaderboard',
      icon: Trophy,
      badge: 'Coming Soon',
      isActive: false
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      badge: 'Coming Soon',
      isActive: false
    }
  ];

  // Sections that have not shipped are not shown ("decide what not to build"); they used to appear as
  // disabled "Coming Soon" tabs. With a single live section there is nothing to switch between, so it
  // is shown as a heading; the tab bar returns as soon as a second section ships.
  const liveTabs = tabs.filter((tab) => !tab.badge);
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
    <nav className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border scrollbar-none">
      {liveTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium shrink-0 transition-colors ${
              tab.isActive
                ? 'border-b-2 border-primary text-primary bg-primary/10 font-semibold'
                : 'text-muted-foreground opacity-60 cursor-not-allowed'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {tab.badge && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 border-input text-muted-foreground">
                {tab.badge}
              </Badge>
            )}
          </div>
        );
      })}
    </nav>
  );
}
