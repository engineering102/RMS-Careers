import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Users } from 'lucide-react';
import { db } from '@rms/db';
import { getBatchRoster, type RosterStudent } from '@rms/academic/tutor/roster';
import { requireTutorBatch } from '@/lib/db/tutor-context';
import { formatIstDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';
import { IndicatorList } from '@/components/batches/indicator-list';

export const metadata = { title: 'Students — RMS Tutor Portal' };

const PAGE_SIZE = 50;
const SORTS = {
  name: { label: 'Name', compare: (a: RosterStudent, b: RosterStudent) => a.fullName.localeCompare(b.fullName) },
  completion: { label: 'Completion (lowest first)', compare: (a: RosterStudent, b: RosterStudent) => a.progress.percentage - b.progress.percentage || a.fullName.localeCompare(b.fullName) },
  signals: { label: 'Most signals first', compare: (a: RosterStudent, b: RosterStudent) => b.indicators.length - a.indicators.length || a.fullName.localeCompare(b.fullName) }
} as const;
type SortKey = keyof typeof SORTS;

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function BatchStudentsPage({
  params,
  searchParams
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { batchId } = await params;
  const query = await searchParams;
  const tutor = await requireTutorBatch(batchId);
  const roster = await getBatchRoster(db, tutor.scope, batchId);
  if (!roster) notFound();

  const sort: SortKey = one(query.sort) in SORTS ? (one(query.sort) as SortKey) : 'name';
  const pages = Math.max(1, Math.ceil(roster.students.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(query.page), 10) || 1));
  const rows = [...roster.students].sort(SORTS[sort].compare).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const href = (change: { sort?: SortKey; page?: number }) => {
    const next = new URLSearchParams();
    const s = change.sort ?? sort;
    if (s !== 'name') next.set('sort', s);
    const p = change.page ?? (change.sort ? 1 : page);
    if (p > 1) next.set('page', String(p));
    const qs = next.toString();
    return `/batches/${batchId}/students${qs ? `?${qs}` : ''}`;
  };

  if (roster.students.length === 0) {
    return <EmptyState icon={Users} title="No students yet" description="Students appear here once their enrollment in this batch is confirmed." />;
  }

  return (
    <section aria-labelledby="roster-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="roster-heading" className="text-xl font-semibold">Students</h2>
          <p className="text-sm text-muted-foreground">
            {roster.students.length} enrolled · completion counts required items, as students see it. Tutoring signals are prompts, not grades.
          </p>
        </div>
        <nav aria-label="Sort students">
          <ul className="flex flex-wrap gap-2">
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <li key={key}>
                <Link
                  href={href({ sort: key })}
                  aria-current={sort === key ? 'true' : undefined}
                  className={`inline-flex min-h-[44px] items-center rounded-md border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    sort === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {SORTS[key].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((s) => (
          <li key={s.studentId} className="rounded-lg border border-border bg-card p-4">
            <Link href={`/batches/${batchId}/students/${s.studentId}`} className="font-semibold underline-offset-4 hover:underline">
              {s.fullName}
            </Link>
            <p className="text-xs text-muted-foreground">
              {[s.collegeRollNumber, s.branch, s.year ? `Year ${s.year}` : null].filter(Boolean).join(' · ') || '—'}
            </p>
            <p className="mt-2 text-sm">
              {s.progress.percentage}% complete <span className="text-muted-foreground">({s.progress.completedRequired}/{s.progress.totalRequired})</span>
            </p>
            <p className="text-xs text-muted-foreground">Last activity: {s.lastActivityAt ? formatIstDate(s.lastActivityAt) : 'none'}</p>
            <div className="mt-2">
              <IndicatorList indicators={s.indicators} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block" role="region" aria-label="Students" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Student</th>
              <th scope="col" className="px-4 py-3 font-medium">Roll number</th>
              <th scope="col" className="px-4 py-3 font-medium">Branch · Year</th>
              <th scope="col" className="px-4 py-3 font-medium">Completion</th>
              <th scope="col" className="px-4 py-3 font-medium">Last activity</th>
              <th scope="col" className="px-4 py-3 font-medium">Tutoring signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((s) => (
              <tr key={s.studentId} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/batches/${batchId}/students/${s.studentId}`} className="font-medium underline-offset-4 hover:underline">
                    {s.fullName}
                  </Link>
                  <span className="block break-all text-xs text-muted-foreground">{s.email}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.collegeRollNumber ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{[s.branch, s.year ? `Year ${s.year}` : null].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-4 py-3">
                  <span className="tabular-nums">{s.progress.percentage}%</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.progress.completedRequired}/{s.progress.totalRequired} required
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{s.lastActivityAt ? formatIstDate(s.lastActivityAt) : 'None'}</td>
                <td className="px-4 py-3"><IndicatorList indicators={s.indicators} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <nav aria-label="Pages" className="flex flex-wrap items-center gap-3 text-sm">
          {page > 1 ? <Link className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 hover:bg-muted" href={href({ page: page - 1 })}>Previous</Link> : null}
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          {page < pages ? <Link className="inline-flex min-h-[44px] items-center rounded-md border border-border px-4 hover:bg-muted" href={href({ page: page + 1 })}>Next</Link> : null}
        </nav>
      ) : null}
    </section>
  );
}
