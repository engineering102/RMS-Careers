import * as React from 'react';
import { getPrograms, getActiveColleges, getBatches } from '@/lib/db';
import { BulkImportClient, type ImportInitialSelection } from './import-client';
import { requireAdminSession } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bulk Student Import | Academy Enrollment'
};

export default async function BulkImportPage(props: { searchParams?: Promise<{ batch?: string }> }) {
  await requireAdminSession();
  const searchParams = props.searchParams ? await props.searchParams : {};
  const [allColleges, allPrograms, allBatches] = await Promise.all([
    getActiveColleges(),
    getPrograms(),
    getBatches()
  ]);

  // ?batch=<id> (from a batch's "Add students" menu) pre-selects that batch. Only a batch that exists
  // and whose program is listed is used; anything else falls back to the empty form. The import
  // actions still re-check the program/batch pair on the server.
  const batch = searchParams.batch ? allBatches.find((b) => b.id === searchParams.batch) : undefined;
  const initialSelection: ImportInitialSelection | null =
    batch && allPrograms.some((p) => p.id === batch.programId)
      ? { collegeId: batch.collegeId, programId: batch.programId, batchId: batch.id, batchName: batch.name }
      : null;

  return (
    <BulkImportClient
      colleges={allColleges}
      programs={allPrograms}
      batches={allBatches}
      initialSelection={initialSelection}
    />
  );
}
