import 'server-only';

import { db, batches, colleges, programs, type DbClient } from '@rms/db';
import { asc, eq } from 'drizzle-orm';
import type { ResolvedPeriod } from '@/lib/analytics/periods';
import {
  collegeAttentionList,
  collegeTotals,
  type AttentionEntry,
  type CollegeBatchReport,
  type CollegeTotals
} from '@/lib/analytics/report-card';
import { getStudentPeriodAnalytics } from './student-period-analytics';

export interface CollegeAnalytics {
  college: { id: string; name: string; code: string; city: string | null; state: string | null };
  period: ResolvedPeriod;
  totals: CollegeTotals;
  /** Batches with at least one enrolled student, by name. */
  batches: CollegeBatchReport[];
  /** Batches of the college with no enrolled students (listed, not reported). */
  emptyBatches: Array<{ id: string; name: string }>;
  attention: AttentionEntry[];
}

/**
 * Period analytics for every batch of a college. Runs the per-batch period report for each batch, so
 * cost grows with the number of batches (a college has a handful), not with students.
 */
export async function getCollegeAnalytics(
  collegeId: string,
  period: ResolvedPeriod,
  now: Date = new Date(),
  client: DbClient = db
): Promise<CollegeAnalytics | null> {
  if (!process.env.POSTGRES_URL) return null;

  const [college] = await client
    .select({
      id: colleges.id,
      name: colleges.name,
      code: colleges.code,
      city: colleges.city,
      state: colleges.state
    })
    .from(colleges)
    .where(eq(colleges.id, collegeId))
    .limit(1);
  if (!college) return null;

  const batchRows = await client
    .select({ id: batches.id, name: batches.name, status: batches.status, programName: programs.name })
    .from(batches)
    .leftJoin(programs, eq(programs.id, batches.programId))
    .where(eq(batches.collegeId, collegeId))
    .orderBy(asc(batches.name));

  const reports = await Promise.all(
    batchRows.map((b) => getStudentPeriodAnalytics(b.id, period, now, client))
  );

  const reported: CollegeBatchReport[] = [];
  const emptyBatches: CollegeAnalytics['emptyBatches'] = [];
  batchRows.forEach((b, i) => {
    const data = reports[i];
    if (!data || data.report.rows.length === 0) {
      emptyBatches.push({ id: b.id, name: b.name });
      return;
    }
    reported.push({
      batch: { id: b.id, name: b.name, status: b.status, programName: b.programName },
      summary: data.report.summary,
      rows: data.report.rows
    });
  });

  return {
    college,
    period,
    totals: collegeTotals(reported),
    batches: reported,
    emptyBatches,
    attention: collegeAttentionList(reported)
  };
}
