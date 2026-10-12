// Who can open a content item in the student portal. Mirrors the student rule: the item is published,
// and is either in one of the student's programs or placed in one of their batch curriculums.

interface AudienceItem {
  lifecycleStatus: 'draft' | 'published' | 'archived';
  programId: number | null;
  batchUsageCount: number;
}

interface AudienceProgram {
  id: number;
  code: string | null;
  name: string;
}

export function describeAudience(item: AudienceItem, programs: AudienceProgram[]): string {
  if (item.lifecycleStatus === 'archived') return 'Archived: hidden from students';

  const batches =
    item.batchUsageCount > 0 ? `${item.batchUsageCount} batch curriculum${item.batchUsageCount === 1 ? '' : 's'}` : null;

  if (item.lifecycleStatus !== 'published') {
    return batches ? `Placed in ${batches}; students see it once published` : 'Students see it once published';
  }
  if (item.programId !== null) {
    const program = programs.find((p) => p.id === item.programId);
    const label = program ? program.code || program.name : 'its program';
    return batches ? `Visible to students in ${label} and in ${batches}` : `Visible to every student in ${label}`;
  }
  return batches ? `Visible to students in ${batches}` : 'Not visible to students yet: add it to a batch curriculum';
}
