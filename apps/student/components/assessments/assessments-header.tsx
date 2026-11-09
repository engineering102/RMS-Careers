import { PageHeader } from '@/components/ui/page-header';
import { Stat } from '@/components/ui/stat-card';
import { formatDate } from '@/lib/format/datetime';
import type { AssessmentHubStats } from '@/lib/types/assessment-hub';
import { cn } from '@/lib/utils';

/** Page title plus four at-a-glance counts, all derived from the same rows the list shows. */
export function AssessmentsHeader({ stats }: { stats: AssessmentHubStats }) {
  const cell = 'py-4 lg:border-l lg:border-border lg:pl-5 lg:first:border-l-0 lg:first:pl-0';
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests"
        description="Timed tests, practice quizzes, projects and external tests. What needs you first is at the top."
      />

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-x-6 border-y border-border lg:grid-cols-4 lg:gap-x-0 [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-border lg:[&>*:nth-child(-n+2)]:border-b-0"
      >
        <Stat
          label="To do"
          value={stats.todo}
          tone={stats.dueSoon > 0 ? 'warning' : 'default'}
          hint={stats.dueSoon > 0 ? `${stats.dueSoon} due in the next 3 days` : 'Nothing due in the next 3 days'}
          className={cell}
        />
        <Stat
          label="Upcoming"
          value={stats.upcoming}
          hint={
            stats.nextOpensAt
              ? `Next opens ${formatDate(stats.nextOpensAt, { day: 'numeric', month: 'short' })}`
              : 'Nothing scheduled yet'
          }
          className={cell}
        />
        <Stat label="Done" value={stats.done} hint={`of ${stats.total} in total`} className={cn(cell)} />
        <Stat
          label="Average score"
          value={stats.averagePercentage !== null ? `${stats.averagePercentage}%` : '—'}
          hint={
            stats.scoredCount > 0
              ? `Across ${stats.scoredCount} scored ${stats.scoredCount === 1 ? 'item' : 'items'}`
              : 'No scores yet'
          }
          className={cell}
        />
      </section>
    </div>
  );
}
