import { redirect } from 'next/navigation';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentDsaData } from '@/lib/db/queries/dsa';
import { getAllDsaSheets } from '@/lib/data/dsa-sheets';
import { resolveLegacyDsaLink, type SheetCardData } from '@/lib/dsa/sheet-view';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { DsaHeader } from '@/components/dsa/dsa-header';
import { SheetCatalog } from '@/components/dsa/sheet-catalog';

export const metadata = {
  title: 'DSA Practice — RMS Student Portal',
  description: 'Curated, pattern-based DSA problem sheets with progress tracking.'
};

interface DsaPageProps {
  searchParams: Promise<{
    sheet?: string;
    batchId?: string;
  }>;
}

export default async function DsaPage({ searchParams }: DsaPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { sheet, batchId } = await searchParams;

  // Links into DSA practice (curriculum items, deadlines, resume card, library) use `?sheet=<sheet or problem slug>`;
  // send them to the sheet route that holds it. Sheet membership is static, so this needs no database read.
  const legacyTarget = resolveLegacyDsaLink(getAllDsaSheets(), sheet, batchId);
  if (legacyTarget) redirect(legacyTarget);

  const dsaData = await getStudentDsaData(context.student.id);

  const summaries = new Map(dsaData.sheetSummaries.map((s) => [s.sheetSlug, s]));
  const cards: SheetCardData[] = dsaData.sheets.map((s) => ({
    slug: s.slug,
    title: s.title,
    shortDescription: s.shortDescription,
    category: s.category,
    company: s.company,
    patternCount: s.patternCount,
    totalProblems: s.questions.length,
    solvedCount: summaries.get(s.slug)?.solvedCount ?? 0,
    percentage: summaries.get(s.slug)?.percentage ?? 0
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <DsaHeader
        summary={dsaData.summary}
        sheetCount={cards.length}
        progressUnavailable={dsaData.progressUnavailable}
      />
      <SheetCatalog cards={cards} batchId={batchId} progressUnavailable={dsaData.progressUnavailable} />
    </div>
  );
}
