import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentDsaData } from '@/lib/db/queries/dsa';
import { getDsaSheetBySlug } from '@/lib/data/dsa-sheets';
import { buildDsaHref } from '@/lib/dsa/sheet-view';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { SheetPracticeView } from '@/components/dsa/sheet-practice-view';
import type { StudentProblemProgress } from '@/lib/types/dsa';

interface SheetPageProps {
  params: Promise<{ sheetSlug: string }>;
  searchParams: Promise<{
    problem?: string;
    batchId?: string;
  }>;
}

export async function generateMetadata({ params }: SheetPageProps) {
  const sheet = getDsaSheetBySlug((await params).sheetSlug);
  return {
    title: `${sheet?.title ?? 'Problem Sheet'} — DSA Practice — RMS Student Portal`,
    description: sheet?.shortDescription ?? 'A curated DSA problem sheet.'
  };
}

export default async function DsaSheetPage({ params, searchParams }: SheetPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const [{ sheetSlug }, { problem, batchId }] = await Promise.all([params, searchParams]);
  const sheet = getDsaSheetBySlug(sheetSlug);
  if (!sheet) notFound();

  // Server-authoritative progress; only this sheet's problems go to the browser.
  const dsaData = await getStudentDsaData(context.student.id);
  const progressMap: Record<string, StudentProblemProgress> = {};
  for (const q of sheet.questions) {
    const progress = dsaData.progressMap[q.slug];
    if (progress) progressMap[q.slug] = progress;
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <li className="shrink-0">
            <Link
              href={buildDsaHref(null, batchId)}
              className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              DSA Practice
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="truncate text-foreground/80">
            {sheet.title}
          </li>
        </ol>
      </nav>

      <SheetPracticeView
        // A different sheet or problem deep link starts fresh (filters, open patterns, selected problem).
        key={`${sheet.slug}:${problem ?? ''}`}
        sheet={sheet}
        initialProgressMap={progressMap}
        initialProblemSlug={problem}
        batchId={batchId}
        progressUnavailable={dsaData.progressUnavailable}
      />
    </div>
  );
}
