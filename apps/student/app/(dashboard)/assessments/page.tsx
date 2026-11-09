import Link from 'next/link';
import { ClipboardCheck, SearchX } from 'lucide-react';

import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentPracticeQuizzes, getStudentFormalAssessments } from '@/lib/db/queries/assessments';
import { getStudentProjectAssignments } from '@/lib/db/queries/projects';
import { getStudentExternalAssessments } from '@/lib/db/queries/external-assessments';
import { getStudentExternalTests } from '@/lib/db/queries/external-tests';
import {
  assessmentHref,
  buildAssessmentItems,
  buildAssessmentView,
  parseAssessmentQuery
} from '@/lib/services/assessment-hub';
import type { AssessmentBucket, AssessmentHubItem } from '@/lib/types/assessment-hub';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { AssessmentsHeader } from '@/components/assessments/assessments-header';
import { AssessmentRow } from '@/components/assessments/assessment-row';
import { AssessmentSearch } from '@/components/assessments/assessment-search';
import { ExternalTestsHashRedirect } from '@/components/assessments/external-tests-hash-redirect';
import {
  AssessmentStatusFilters,
  AssessmentTypeTabs,
  BUCKET_HEADINGS
} from '@/components/assessments/assessment-tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PaginationNav } from '@/components/ui/pagination-nav';

export const metadata = {
  title: 'Tests — RMS Student Portal',
  description: 'Timed tests, practice quizzes, projects and external tests across your batches.'
};

interface AssessmentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Consecutive rows of the same bucket, so a sorted page renders as headed groups. */
function groupByBucket(items: AssessmentHubItem[]): { bucket: AssessmentBucket; items: AssessmentHubItem[] }[] {
  const groups: { bucket: AssessmentBucket; items: AssessmentHubItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.bucket === item.bucket) last.items.push(item);
    else groups.push({ bucket: item.bucket, items: [item] });
  }
  return groups;
}

export default async function AssessmentsPage({ searchParams }: AssessmentsPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const studentId = context.student.id;
  const [query, formal, practice, projects, reports, externalTests] = await Promise.all([
    searchParams.then(parseAssessmentQuery),
    getStudentFormalAssessments(studentId),
    getStudentPracticeQuizzes(studentId),
    getStudentProjectAssignments(studentId),
    getStudentExternalAssessments(studentId),
    getStudentExternalTests(studentId)
  ]);

  const now = new Date();
  const allItems = buildAssessmentItems({ formal, practice, projects, externalTests, reports }, now);
  const view = buildAssessmentView(allItems, query, now);
  const q = view.query;

  const isFiltered = Boolean(q.q || q.batchId || q.tab !== 'all' || q.status !== 'all');
  const firstShown = view.totalCount === 0 ? 0 : (view.page - 1) * view.pageSize + 1;
  const lastShown = firstShown === 0 ? 0 : firstShown + view.items.length - 1;
  // Group headings only help when the list mixes statuses.
  const showGroupHeadings = q.status === 'all';

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <ExternalTestsHashRedirect />
      <AssessmentsHeader stats={view.stats} />

      {allItems.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No assessments yet"
          description="Exams, practice quizzes, projects and external tests appear here as your batch reaches them in the curriculum."
        />
      ) : (
        <section aria-labelledby="assessment-list-heading" className="space-y-4">
          <h2 id="assessment-list-heading" className="sr-only">
            Assessment list
          </h2>

          <AssessmentTypeTabs view={view} />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <AssessmentStatusFilters view={view} />
            <AssessmentSearch currentQuery={q.q} currentBatchId={q.batchId} batches={view.batches} />
          </div>

          {view.totalCount === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches these filters"
              description={
                q.q
                  ? `No assessments match “${q.q}”. Try another title or program code.`
                  : 'Try another status or type.'
              }
              action={
                isFiltered ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/assessments">Clear filters</Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                {groupByBucket(view.items).map((group, index) => (
                  <section
                    key={`${group.bucket}-${index}`}
                    aria-label={showGroupHeadings ? BUCKET_HEADINGS[group.bucket] : undefined}
                  >
                    {showGroupHeadings ? (
                      <h3 className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground sm:px-5">
                        <span>{BUCKET_HEADINGS[group.bucket]}</span>
                        <span className="tabular-nums">{view.statusCounts[group.bucket]}</span>
                      </h3>
                    ) : null}
                    <ul className="divide-y divide-border">
                      {group.items.map((item) => (
                        <AssessmentRow key={item.key} item={item} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Showing <span className="font-medium tabular-nums text-foreground">{firstShown}–{lastShown}</span> of{' '}
                  <span className="font-medium tabular-nums text-foreground">{view.totalCount}</span>
                </p>
                <PaginationNav
                  page={view.page}
                  totalPages={view.totalPages}
                  hrefFor={(page) => assessmentHref(q, { page })}
                />
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
