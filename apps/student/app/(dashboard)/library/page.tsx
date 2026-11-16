import { Suspense } from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getLibraryCatalog } from '@/lib/db/queries/library';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { LibraryBrowser } from '@/components/library/library-browser';
import LibraryLoading from './loading';

export const metadata = {
  title: 'Library — RMS Student Portal',
  description: 'Lectures, notes, practice and resources from your programmes, shelved by subject.'
};

// The page loads the student's whole catalog in one query and hands it to LibraryBrowser, which reads the view
// (?type, ?subject, ?q) from the URL in the browser. Opening a format or subject, going back, and searching
// therefore make no further requests.
export default async function LibraryPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const items = await getLibraryCatalog({
    enrolledProgramIds: Array.from(new Set(context.enrollments.map((e) => e.programId))),
    enrolledBatchIds: context.activeBatches.map((b) => b.batchId)
  });
  const programCodes = Array.from(new Set(context.enrollments.map((e) => e.programCode).filter(Boolean)));

  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryBrowser items={items} programCodes={programCodes} />
    </Suspense>
  );
}
