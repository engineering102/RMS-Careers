import { CalendarClock, CheckCircle2, ListTodo, Target } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { formatDate } from '@/lib/format/datetime';
import type { AssessmentHubStats } from '@/lib/types/assessment-hub';

/** Page title plus four at-a-glance counts, all derived from the same rows the list shows. */
export function AssessmentsHeader({ stats }: { stats: AssessmentHubStats }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment center"
        title="Assessments"
        description="Timed exams, practice quizzes, projects and external tests in one place. What needs you first is at the top."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="To do"
          value={stats.todo}
          icon={ListTodo}
          tone={stats.dueSoon > 0 ? 'warning' : 'info'}
          hint={stats.dueSoon > 0 ? `${stats.dueSoon} need attention soon` : 'Nothing due in the next 3 days'}
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          icon={CalendarClock}
          hint={
            stats.nextOpensAt
              ? `Next opens ${formatDate(stats.nextOpensAt, { day: 'numeric', month: 'short' })}`
              : 'Nothing scheduled yet'
          }
        />
        <StatCard
          label="Done"
          value={stats.done}
          icon={CheckCircle2}
          tone="success"
          hint={`of ${stats.total} in total`}
        />
        <StatCard
          label="Average score"
          value={stats.averagePercentage !== null ? `${stats.averagePercentage}%` : '—'}
          icon={Target}
          tone="info"
          hint={
            stats.scoredCount > 0
              ? `Across ${stats.scoredCount} scored ${stats.scoredCount === 1 ? 'item' : 'items'}`
              : 'No scores yet'
          }
        />
      </div>
    </div>
  );
}
