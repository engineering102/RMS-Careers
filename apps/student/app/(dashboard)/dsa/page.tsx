import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentDsaData } from '@/lib/db/queries/dsa';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { DsaHeader } from '@/components/dsa/dsa-header';
import { DsaPracticeCenter } from '@/components/dsa/dsa-practice-center';

export const metadata = {
  title: 'DSA Practice Center — RMS Student Portal',
  description: 'Curated pattern-based problem solving and algorithmic progress tracking.'
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

  // Server-authoritative query (retrieves student's database progress ledger)
  const dsaData = await getStudentDsaData(context.student.id);

  const patternCount = new Set(dsaData.sheets.flatMap((s) => s.questions.map((q) => q.pattern))).size;
  const estimatedHours = dsaData.sheets.reduce((sum, s) => sum + s.estimatedHours, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Sheet overview with progress by difficulty */}
      <DsaHeader
        summary={dsaData.summary}
        topicCount={dsaData.sheets.length}
        patternCount={patternCount}
        estimatedHours={estimatedHours}
      />

      {/* 2. Topic-by-topic problem sheet with search and filters */}
      <DsaPracticeCenter
        initialData={dsaData}
        initialSheetSlug={sheet}
        batchId={batchId}
      />
    </div>
  );
}
