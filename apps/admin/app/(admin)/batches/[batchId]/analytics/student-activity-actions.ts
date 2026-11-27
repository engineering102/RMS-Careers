'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import { getStudentPeriodAnalytics } from '@/lib/db/queries';
import { PERIOD_KEYS, resolvePeriod } from '@/lib/analytics/periods';
import { studentPeriodReportCsv } from '@/lib/analytics/student-period-metrics';

const exportSchema = z.object({
  batchId: z.string().uuid(),
  period: z.enum(PERIOD_KEYS),
  from: z.string().max(10).nullish(),
  to: z.string().max(10).nullish()
});

export async function exportStudentActivityCsvAction(input: {
  batchId: string;
  period: string;
  from?: string | null;
  to?: string | null;
}): Promise<{ success: boolean; filename?: string; csvContent?: string; error?: string }> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = exportSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid export request.' };

    const { batchId, period: key, from, to } = parsed.data;
    const now = new Date();
    const period = resolvePeriod(key, now, { from, to });
    const data = await getStudentPeriodAnalytics(batchId, period, now);
    if (!data) return { success: false, error: 'Batch not found.' };

    const safeName = data.batch.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    return {
      success: true,
      filename: `student-activity-${safeName || 'batch'}-${period.from}-to-${period.to}.csv`,
      csvContent: studentPeriodReportCsv(data.report, {
        batchName: data.batch.name,
        collegeName: data.college?.name ?? null,
        period
      })
    };
  } catch (error) {
    console.error('Error in exportStudentActivityCsvAction:', error);
    return { success: false, error: 'An unexpected error occurred while generating the export.' };
  }
}
