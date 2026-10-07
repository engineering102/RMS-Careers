'use server';

import { auth } from '@/lib/auth';
import {
  exportBatchAnalyticsReportCsv,
  type AnalyticsReportType
} from '@/lib/db/queries';

export async function exportBatchAnalyticsCsvAction(
  batchId: string,
  reportType: AnalyticsReportType
): Promise<{
  success: boolean;
  filename?: string;
  csvContent?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'Unauthorized access. Admin authentication required.' };
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return { success: false, error: 'Forbidden. Insufficient permissions to export academic reports.' };
    }

    if (!batchId) {
      return { success: false, error: 'Invalid batch identifier.' };
    }

    const result = await exportBatchAnalyticsReportCsv(batchId, reportType);
    if (!result) {
      return { success: false, error: 'Failed to generate report for this batch.' };
    }

    return {
      success: true,
      filename: result.filename,
      csvContent: result.csvContent
    };
  } catch (error: any) {
    console.error('Error in exportBatchAnalyticsCsvAction:', error);
    return {
      success: false,
      error: error?.message || 'An unexpected error occurred while generating CSV export.'
    };
  }
}
