import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import {
  getLibraryCategorySummaries,
  getLibraryItems,
  getLibrarySubjectCounts
} from '@/lib/db/queries/library';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { ContentCard } from '@/components/library/content-card';
import { SearchFilterBar } from '@/components/library/search-filter-bar';
import { LibraryEmptyState } from '@/components/library/library-empty-state';
import { CategoryCard } from '@/components/library/category-card';
import { CategoryHeader } from '@/components/library/category-header';
import { SubjectNav } from '@/components/library/subject-nav';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getLibraryCategory, LIBRARY_CATEGORIES } from '@/lib/data/library-categories';
import { getLibrarySubject, librarySubjectHref } from '@/lib/data/library-subjects';
import type { LibraryItem } from '@/lib/types/library';

export const metadata = {
  title: 'Library — RMS Student Portal',
  description:
    'Searchable, topic-categorized, self-paced learning resources across your enrolled programs.'
};

interface LibraryPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    topic?: string;
    subject?: string;
    page?: string;
  }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const student = context.student;
  const enrolledProgramIds = Array.from(new Set(context.enrollments.map((e) => e.programId)));
  const enrolledBatchIds = context.activeBatches.map((b) => b.batchId);

  // Await search params in Next.js 15
  const params = await searchParams;
  const currentQuery = params.q?.trim() || '';
  // Unknown ?type= values fall back to the category hub rather than an always-empty list.
  const activeCategory = getLibraryCategory(params.type?.trim());
  const currentType = activeCategory?.type ?? 'all';
  const currentTopic = params.topic?.trim() || 'all';
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);

  // Unknown ?subject= values are ignored, like unknown types.
  const activeSubject = getLibrarySubject(params.subject?.trim());

  const isSearching = Boolean(currentQuery || currentTopic !== 'all');
  const showHub = !activeCategory && !activeSubject && !isSearching;
  // Inside a category with no subject picked, list items subject by subject under headings.
  const groupBySubject = Boolean(activeCategory && !activeSubject && !currentQuery);

  const summariesPromise = getLibraryCategorySummaries({ enrolledProgramIds, enrolledBatchIds });
  const subjectCountsPromise = getLibrarySubjectCounts({
    enrolledProgramIds,
    enrolledBatchIds,
    contentType: currentType
  });

  const enrolledProgramsBadge = (
    <div className="flex items-center gap-2 self-start md:self-auto rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground">
      <span>Enrolled Programs:</span>
      <span className="font-semibold text-foreground">
        {context.enrollments.map((e) => e.programCode).join(', ') || 'Active'}
      </span>
    </div>
  );

  const hubHeader = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
      <div>
        <h1 className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground md:text-[2rem]">
          Library
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Recorded lectures, notes, practice sheets and resources from your programmes, to go through at your own pace.
        </p>
      </div>
      {enrolledProgramsBadge}
    </div>
  );

  // Category hub: one themed card per content type.
  if (showHub) {
    const [summaries, subjectCounts] = await Promise.all([summariesPromise, subjectCountsPromise]);
    const byType = new Map(summaries.map((s) => [s.contentType, s]));

    return (
      <div className="space-y-8">
        {hubHeader}

        <SearchFilterBar
          availableTopics={[]}
          currentQuery=""
          showTopicFilter={false}
          placeholder="Search across all categories..."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LIBRARY_CATEGORIES.map((category) => {
            const summary = byType.get(category.type);
            return (
              <CategoryCard
                key={category.type}
                category={category}
                itemCount={summary?.itemCount ?? 0}
                topicCount={summary?.topicCount ?? 0}
              />
            );
          })}
        </div>

        {subjectCounts.length > 0 && (
          <section aria-labelledby="library-subjects-heading" className="space-y-3">
            <div>
              <h2 id="library-subjects-heading" className="text-sm font-semibold text-foreground">
                Browse by subject
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Everything on one subject, across lectures, notes and practice.
              </p>
            </div>
            <SubjectNav counts={subjectCounts} showAll={false} />
          </section>
        )}
      </div>
    );
  }

  // Fetch authorized library catalog for the open category (or cross-category search)
  const [result, summaries, subjectCounts] = await Promise.all([
    getLibraryItems(student.id, {
      enrolledProgramIds,
      enrolledBatchIds,
      filters: {
        query: currentQuery,
        contentType: currentType,
        topic: currentTopic,
        subject: activeSubject?.slug,
        groupBySubject,
        page: currentPage,
        limit: 24
      }
    }),
    summariesPromise,
    subjectCountsPromise
  ]);

  const isFiltered = isSearching || Boolean(activeSubject);

  // Consecutive runs of one subject (the query orders by subject when grouping).
  const sections: { subject: string; items: LibraryItem[] }[] = [];
  if (groupBySubject) {
    for (const item of result.items) {
      const last = sections[sections.length - 1];
      if (last && last.subject === item.subject) last.items.push(item);
      else sections.push({ subject: item.subject, items: [item] });
    }
  }
  const showSubjectHeadings = sections.length > 1;

  const buildPageUrl = (targetPage: number) => {
    const urlParams = new URLSearchParams();
    if (currentQuery) urlParams.set('q', currentQuery);
    if (currentType && currentType !== 'all') urlParams.set('type', currentType);
    if (currentTopic && currentTopic !== 'all') urlParams.set('topic', currentTopic);
    if (activeSubject) urlParams.set('subject', activeSubject.slug);
    if (targetPage > 1) urlParams.set('page', targetPage.toString());

    const qs = urlParams.toString();
    return qs ? `/library?${qs}` : '/library';
  };

  return (
    <div className="space-y-8">
      {/* 1. Header: themed category banner, or the hub header with a way back for cross-category search */}
      {activeCategory ? (
        <CategoryHeader
          category={activeCategory}
          totalCount={
            summaries.find((s) => s.contentType === activeCategory.type)?.itemCount ??
            result.totalCount
          }
        />
      ) : (
        <div className="space-y-4">
          <Link
            href="/library"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            All categories
          </Link>
          {hubHeader}
        </div>
      )}

      {/* 2. Subject classification within the open category (or across all of them) */}
      <SubjectNav
        counts={subjectCounts}
        type={activeCategory?.type}
        activeSubject={activeSubject?.slug}
        label={activeCategory ? `${activeCategory.label} by subject` : 'Browse by subject'}
      />

      {/* 3. Interactive Search & Topic Filter Bar */}
      <SearchFilterBar
        availableTopics={result.availableTopics}
        currentQuery={currentQuery}
        currentType={currentType}
        currentTopic={currentTopic}
        currentSubject={activeSubject?.slug}
        placeholder={
          activeCategory
            ? `Search ${activeCategory.label.toLowerCase()}...`
            : 'Search across all categories...'
        }
      />

      {/* 4. Results Header & Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <div>
          {result.totalCount > 0 ? (
            <span>
              Showing <strong className="text-foreground">{result.items.length}</strong> of{' '}
              <strong className="text-foreground">{result.totalCount}</strong>{' '}
              {result.totalCount === 1 ? 'learning resource' : 'learning resources'}
            </span>
          ) : (
            <span>No resources match the selected criteria</span>
          )}
        </div>

        {result.totalPages > 1 && (
          <span>
            Page <strong className="text-foreground">{result.page}</strong> of{' '}
            <strong className="text-foreground">{result.totalPages}</strong>
          </span>
        )}
      </div>

      {/* 5. Content Cards Grid (under subject headings when grouped) or Empty State */}
      {result.totalCount === 0 ? (
        <LibraryEmptyState isFiltered={isFiltered} />
      ) : showSubjectHeadings ? (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.subject} aria-labelledby={`subject-${section.subject}`} className="space-y-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <h2 id={`subject-${section.subject}`} className="text-sm font-semibold text-foreground">
                  {getLibrarySubject(section.subject)?.label ?? section.subject}
                </h2>
                <Link
                  href={librarySubjectHref({ type: activeCategory?.type, subject: section.subject })}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all{' '}
                  {subjectCounts.find((c) => c.subject === section.subject)?.itemCount ?? section.items.length}
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* 6. Pagination Controls (if multiple pages) */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-border">
          <Button
            asChild={result.page > 1}
            disabled={result.page <= 1}
            variant="outline"
            size="sm"
            className="text-xs border-border bg-card text-foreground gap-1.5"
          >
            {result.page > 1 ? (
              <Link href={buildPageUrl(result.page - 1)}>
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Link>
            ) : (
              <span>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}
          </Button>

          <span className="text-xs text-muted-foreground">
            {result.page} / {result.totalPages}
          </span>

          <Button
            asChild={result.page < result.totalPages}
            disabled={result.page >= result.totalPages}
            variant="outline"
            size="sm"
            className="text-xs border-border bg-card text-foreground gap-1.5"
          >
            {result.page < result.totalPages ? (
              <Link href={buildPageUrl(result.page + 1)}>
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span>
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
