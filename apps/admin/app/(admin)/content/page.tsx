import * as React from 'react';
import {
  countContentItems,
  getContentItemsWithDetails,
  getPrograms
} from '@/lib/db/queries';
import type { ContentTypeEnum } from '@rms/db';
import { ContentClient } from './content-client';
import { requireAdminSession } from '@/lib/authz';

export const metadata = {
  title: 'Content Library | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

/** Content library page size; `?page=` selects the page (1-based). */
const PAGE_SIZE = 50;

export default async function ContentPage(props: {
  searchParams: Promise<{
    program?: string;
    type?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireAdminSession();
  const searchParams = await props.searchParams;

  const searchQuery = searchParams.q || undefined;
  const typeFilter = (searchParams.type as ContentTypeEnum) || undefined;
  const statusFilter = (searchParams.status as 'all' | 'draft' | 'published' | 'archived') || undefined;

  let programIdFilter: number | 'global' | 'all' | undefined = undefined;
  if (searchParams.program) {
    if (searchParams.program === 'global') {
      programIdFilter = 'global';
    } else if (searchParams.program !== 'all') {
      const parsed = parseInt(searchParams.program, 10);
      if (!isNaN(parsed)) {
        programIdFilter = parsed;
      }
    }
  }

  const filters = {
    search: searchQuery,
    programId: programIdFilter,
    contentType: typeFilter && typeFilter !== ('all' as any) ? typeFilter : undefined,
    status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined
  };

  // Count first so an out-of-range ?page= (e.g. after deleting the last item on it) shows the last page.
  const totalCount = await countContentItems(filters);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const requestedPage = parseInt(searchParams.page || '1', 10);
  const page = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);

  const [contentList, programsList] = await Promise.all([
    getContentItemsWithDetails({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getPrograms()
  ]);

  return (
    <ContentClient
      initialContentItems={contentList}
      programs={programsList}
      selectedProgramId={searchParams.program || 'all'}
      selectedType={searchParams.type || 'all'}
      selectedStatus={searchParams.status || 'all'}
      searchQuery={searchQuery || ''}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
