import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  FileCode2,
  BookOpen,
  HelpCircle,
  FolderGit2,
  Calendar
} from 'lucide-react';
import type { StudentDeadlineItem, DeadlineContentType } from '@/lib/db/queries/overview';

interface DeadlinesCardProps {
  deadlines: StudentDeadlineItem[];
}

function getContentTypeMeta(type: DeadlineContentType) {
  switch (type) {
    case 'quiz':
      return {
        label: 'Quiz',
        icon: HelpCircle,
        className: 'border-purple-500/30 bg-purple-500/10 text-purple-300'
      };
    case 'project':
      return {
        label: 'Project',
        icon: FolderGit2,
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      };
    case 'dsa_sheet':
      return {
        label: 'DSA Practice',
        icon: FileCode2,
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      };
    case 'lecture':
      return {
        label: 'Lecture',
        icon: BookOpen,
        className: 'border-blue-500/30 bg-blue-500/10 text-blue-300'
      };
    default:
      return {
        label: 'Milestone',
        icon: Calendar,
        className: 'border-slate-700 bg-slate-800 text-slate-300'
      };
  }
}

function formatRelativeDeadline(dueAtDate: Date) {
  const now = new Date();
  const due = new Date(dueAtDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { text: 'Due Today', isUrgent: true };
  } else if (diffDays === 1) {
    return { text: 'Due Tomorrow', isUrgent: true };
  } else if (diffDays <= 3) {
    return { text: `Due in ${diffDays} days`, isUrgent: true };
  } else {
    return {
      text: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      isUrgent: false
    };
  }
}

export function DeadlinesCard({ deadlines }: DeadlinesCardProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-200">
              Upcoming Deadlines
            </CardTitle>
            <p className="text-xs text-slate-400">Aggregated from your active cohort timelines</p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="border-slate-700 bg-slate-800/80 text-slate-300 font-medium"
        >
          {deadlines.length} {deadlines.length === 1 ? 'Deadline' : 'Deadlines'}
        </Badge>
      </CardHeader>

      <CardContent>
        {deadlines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200">All Caught Up!</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
              No pending deadlines for your enrolled batches. Enjoy your progress or practice ahead in
              the library.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((item) => {
              const meta = getContentTypeMeta(item.contentType);
              const Icon = meta.icon;
              const relative = formatRelativeDeadline(item.dueAt);

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3.5 hover:border-slate-700/80 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-100 line-clamp-1">
                          {item.title}
                        </span>
                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${meta.className}`}>
                          {meta.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="text-slate-300 font-medium">{item.batchName}</span>
                        <span>·</span>
                        <span>Week {item.weekNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <span
                      className={`text-xs font-semibold ${
                        relative.isUrgent ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {relative.text}
                    </span>

                    {item.isCompleted ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        {new Date(item.dueAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
