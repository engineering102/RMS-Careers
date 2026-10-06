import * as React from 'react';
import { getPrograms, getColleges, getBatches } from '@/lib/db';
import { BulkImportClient } from './import-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bulk Student Import | Academy Enrollment'
};

export default async function BulkImportPage() {
  const [allColleges, allPrograms, allBatches] = await Promise.all([
    getColleges(),
    getPrograms(),
    getBatches()
  ]);

  return (
    <BulkImportClient
      colleges={allColleges}
      programs={allPrograms}
      batches={allBatches}
    />
  );
}
