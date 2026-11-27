'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { PeriodKey } from '@/lib/analytics/periods';
import { exportCollegeReportCsvAction } from './actions';

export function ExportCollegeButton({
  collegeId,
  period
}: {
  collegeId: string;
  period: { key: PeriodKey; from: string; to: string };
}) {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportCollegeReportCsvAction({
        collegeId,
        period: period.key,
        from: period.key === 'custom' ? period.from : null,
        to: period.key === 'custom' ? period.to : null
      });
      if (!res.success || !res.csvContent || !res.filename) {
        toast.error(res.error || 'Failed to export the college report.');
        return;
      }
      const url = URL.createObjectURL(new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('College report exported.');
    } catch {
      toast.error('An unexpected error occurred while exporting.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 text-xs gap-1.5 print:hidden"
      onClick={handleExport}
      disabled={exporting}
    >
      <Download className="h-3.5 w-3.5" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
