import * as React from 'react';
import { getPrograms } from '@/lib/db';
import { BulkImportClient } from './import-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bulk Student Import | Academy Enrollment'
};

export default async function BulkImportPage() {
  const allPrograms = await getPrograms();

  return <BulkImportClient programs={allPrograms} />;
}
