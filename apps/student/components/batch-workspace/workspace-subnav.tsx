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

  return (
    <nav className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium shrink-0 transition-colors ${
              tab.isActive
                ? 'border-b-2 border-blue-500 text-blue-400 bg-blue-500/10 font-semibold'
                : 'text-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
            {tab.badge && (
              <Badge variant="outline" className="text-[10px] py-0 px-1 border-slate-700 text-slate-400">
                {tab.badge}
              </Badge>
            )}
          </div>
        );
      })}
    </nav>
  );
}
