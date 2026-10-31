import { BookOpen } from 'lucide-react';
import { db } from '@rms/db';
import { loadBatchCurriculum } from '@rms/academic/tutor/progress';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { CONTENT_TYPE_LABELS, formatIstDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'Curriculum — RMS Tutor Portal' };

/** What students of this batch see, week by week (published items only). Read-only. */
export default async function BatchCurriculumPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const tutor = await requireTutorBatch(batchId);
  const items = await loadBatchCurriculum(db, tutor.scope, batchId);

  if (items.length === 0) {
    return <EmptyState icon={BookOpen} title="No curriculum yet" description="Published curriculum items for this batch will be listed here." />;
  }

  const weeks = new Map<number, typeof items>();
  for (const item of items) weeks.set(item.weekNumber, [...(weeks.get(item.weekNumber) ?? []), item]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Curriculum</h2>
      {[...weeks.entries()].map(([week, weekItems]) => (
        <section key={week} aria-labelledby={`cw-${week}`} className="space-y-2">
          <h3 id={`cw-${week}`} className="font-semibold">Week {week}</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {weekItems.map((item) => (
              <li key={item.contentItemId} className="p-3">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}
                  {item.isRequired ? ' · Required' : ' · Optional'}
                  {item.availableFrom ? ` · Opens ${formatIstDate(item.availableFrom)}` : ''}
                  {item.dueAt ? ` · Due ${formatIstDate(item.dueAt)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
