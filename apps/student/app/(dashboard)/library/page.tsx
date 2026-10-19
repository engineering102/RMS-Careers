import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getLibraryCategorySummaries, getLibraryItems } from '@/lib/db/queries/library';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { ContentCard } from '@/components/library/content-card';
import { SearchFilterBar } from '@/components/library/search-filter-bar';
import { LibraryEmptyState } from '@/components/library/library-empty-state';
import { CategoryCard } from '@/components/library/category-card';
import { CategoryHeader } from '@/components/library/category-header';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Library as LibraryIcon } from 'lucide-react';
import Link from 'next/link';
import { getLibraryCategory, LIBRARY_CATEGORIES } from '@/lib/data/library-categories';

export const metadata = {
  title: 'My Library — RMS Student Portal',
  description:
    'Searchable, topic-categorized, self-paced learning resources across your enrolled programs.'
};

interface LibraryPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    topic?: string;
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

  const isSearching = Boolean(currentQuery || currentTopic !== 'all');
  const showHub = !activeCategory && !isSearching;

  const summariesPromise = getLibraryCategorySummaries({ enrolledProgramIds, enrolledBatchIds });

  const enrolledProgramsBadge = (
    <div className="flex items-center gap-2 self-start md:self-auto rounded-lg border border-border bg-card/60 px-3.5 py-2 text-xs text-muted-foreground">
      <span>Enrolled Programs:</span>
      <span className="font-semibold text-foreground">
        {context.enrollments.map((e) => e.programCode).join(', ') || 'Active'}
      </span>
    </div>
  );

  const hubHeader = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary uppercase">
          <LibraryIcon className="h-4 w-4" />
          <span>Resource Catalog · Self-Paced</span>
        </div>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          My Library
        </h1>
        <p className="mt-1.5 text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Recorded lectures, study notes, practice sheets, and learning resources across your
          enrolled programs. Pick a category to dive in, or search everything at once.
        </p>
      </div>
      {enrolledProgramsBadge}
    </div>
  );

  // Category hub: one themed card per content type.
  if (showHub) {
    const summaries = await summariesPromise;
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
      </div>
    );
  }

  // Fetch authorized library catalog for the open category (or cross-category search)
  const [result, summaries] = await Promise.all([
    getLibraryItems(student.id, {
      enrolledProgramIds,
      enrolledBatchIds,
      filters: {
        query: currentQuery,
        contentType: currentType,
        topic: currentTopic,
        page: currentPage,
        limit: 24
      }
    }),
    summariesPromise
  ]);

  const isFiltered = isSearching;

  const buildPageUrl = (targetPage: number) => {
    const urlParams = new URLSearchParams();
    if (currentQuery) urlParams.set('q', currentQuery);
    if (currentType && currentType !== 'all') urlParams.set('type', currentType);
    if (currentTopic && currentTopic !== 'all') urlParams.set('topic', currentTopic);
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

      {/* 2. Interactive Search & Topic Filter Bar */}
      <SearchFilterBar
        availableTopics={result.availableTopics}
        currentQuery={currentQuery}
        currentType={currentType}
        currentTopic={currentTopic}
        placeholder={
          activeCategory
            ? `Search ${activeCategory.label.toLowerCase()}...`
            : 'Search across all categories...'
        }
      />

      {/* 3. Results Header & Count */}
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

      {/* 4. Content Cards Grid or Empty State */}
      {result.totalCount === 0 ? (
        <LibraryEmptyState isFiltered={isFiltered} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* 5. Pagination Controls (if multiple pages) */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-border">
          <Button
            asChild={result.page > 1}
            disabled={result.page <= 1}
            variant="outline"
            size="sm"
            className="text-xs border-border bg-card/80 text-foreground/80 gap-1.5"
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
            className="text-xs border-border bg-card/80 text-foreground/80 gap-1.5"
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
