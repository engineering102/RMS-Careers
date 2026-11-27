'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/authz';
import { getCollegeAnalytics } from '@/lib/db/queries';
import { PERIOD_KEYS, resolvePeriod } from '@/lib/analytics/periods';
import { collegeReportCsv } from '@/lib/analytics/report-card';

const exportSchema = z.object({
  collegeId: z.string().uuid(),
  period: z.enum(PERIOD_KEYS),
  from: z.string().max(10).nullish(),
  to: z.string().max(10).nullish()
});

export async function exportCollegeReportCsvAction(input: {
  collegeId: string;
  period: string;
  from?: string | null;
  to?: string | null;
}): Promise<{ success: boolean; filename?: string; csvContent?: string; error?: string }> {
  try {
    const authz = await requireAdmin();
    if (!authz.ok) return { success: false, error: authz.error };

    const parsed = exportSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid export request.' };

    const { collegeId, period: key, from, to } = parsed.data;
    const now = new Date();
    const period = resolvePeriod(key, now, { from, to });
    const data = await getCollegeAnalytics(collegeId, period, now);
    if (!data) return { success: false, error: 'College not found.' };

    const code = data.college.code.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'college';
    return {
      success: true,
      filename: `college-report-${code}-${period.from}-to-${period.to}.csv`,
      csvContent: collegeReportCsv(data.batches, { collegeName: data.college.name, period })
    };
  } catch (error) {
    console.error('Error in exportCollegeReportCsvAction:', error);
    return { success: false, error: 'An unexpected error occurred while generating the export.' };
  }
}
