'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { exportBatchRosterCsvAction } from './students/actions';

/** Downloads students with portal access as `name,email` CSV (e.g. for a QwikTest candidate import). */
export function ExportRosterButton({ batchId, disabled }: { batchId: string; disabled?: boolean }) {
  const [pending, setPending] = React.useState(false);

  const handleExport = async () => {
    setPending(true);
    try {
      const res = await exportBatchRosterCsvAction(batchId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.data.rowCount} ${res.data.rowCount === 1 ? 'student' : 'students'}.`);
    } catch {
      toast.error('An unexpected error occurred while exporting the roster.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || pending}
      title="Students with portal access, as name and email (for an external test's candidate list)"
    >
      <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
      {pending ? 'Exporting…' : 'Export roster CSV'}
    </Button>
  );
}
