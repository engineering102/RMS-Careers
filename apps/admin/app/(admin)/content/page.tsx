import * as React from 'react';
import {
  getContentItemsWithDetails,
  getPrograms
} from '@/lib/db/queries';
import type { ContentTypeEnum } from '@rms/db';
import { ContentClient } from './content-client';

export const metadata = {
  title: 'Content Library | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function ContentPage(props: {
  searchParams: Promise<{
    program?: string;
    type?: string;
    status?: string;
    q?: string;
  }>;
}) {
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

  const [contentList, programsList] = await Promise.all([
    getContentItemsWithDetails({
      search: searchQuery,
      programId: programIdFilter,
      contentType: typeFilter && typeFilter !== ('all' as any) ? typeFilter : undefined,
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined
    }),
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
    />
  );
}
