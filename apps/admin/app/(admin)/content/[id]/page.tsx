import * as React from 'react';
import { notFound } from 'next/navigation';
import { getContentItemById, getProgramById, getPrograms, getProjectAssignmentConfig } from '@/lib/db/queries';
import { requireAdminSession } from '@/lib/authz';
import { ContentBuilderClient } from './content-builder-client';

export const metadata = {
  title: 'Content Builder | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ContentBuilderPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await props.params;
  if (!UUID_REGEX.test(id)) notFound();

  const item = await getContentItemById(id);
  if (!item) notFound();

  const [programs, projectConfig] = await Promise.all([
    getPrograms(),
    item.contentType === 'project' ? getProjectAssignmentConfig(id) : Promise.resolve(null)
  ]);

  // Keep an archived/inactive program selectable if this item still belongs to it.
  if (item.programId !== null && !programs.some((p) => p.id === item.programId)) {
    const current = await getProgramById(item.programId);
    if (current) programs.push(current);
  }

  return <ContentBuilderClient item={item} programs={programs} projectConfig={projectConfig} />;
}
