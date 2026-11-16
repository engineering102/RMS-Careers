'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateBatchAction } from '../actions';
import { BATCH_STATUSES, STUDENT_ACCESS_BATCH_STATUSES, type BatchStatus } from '../schema';

const STATUS_LABEL: Record<BatchStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived'
};

const STATUS_EFFECT: Record<BatchStatus, string> = {
  draft: 'Students cannot open a draft batch. Use it while you are still setting the batch up.',
  active: 'Students with a confirmed enrollment can open the batch, and its curriculum can be edited.',
  completed: 'Students keep access to the batch. Its curriculum becomes read-only.',
  archived: 'Students lose access to the batch, and its curriculum becomes read-only.'
};

/** `YYYY-MM-DD` of a stored batch date. Batch dates are saved as UTC midnight of the chosen day. */
function toDateInput(value: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function isBatchStatus(value: string): value is BatchStatus {
  return (BATCH_STATUSES as readonly string[]).includes(value);
}

export interface EditableBatch {
  id: string;
  name: string;
  status: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
}

/** Edit a batch's name, timeline and status. College and program are fixed when the batch is created. */
export function EditBatchDialog({ batch }: { batch: EditableBatch }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [name, setName] = React.useState(batch.name);
  const [startDate, setStartDate] = React.useState(toDateInput(batch.startDate));
  const [endDate, setEndDate] = React.useState(toDateInput(batch.endDate));
  const [status, setStatus] = React.useState<BatchStatus>(isBatchStatus(batch.status) ? batch.status : 'active');
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(batch.name);
      setStartDate(toDateInput(batch.startDate));
      setEndDate(toDateInput(batch.endDate));
      setStatus(isBatchStatus(batch.status) ? batch.status : 'active');
      setError(null);
    }
    setOpen(next);
  };

  const hadAccess = isBatchStatus(batch.status) && STUDENT_ACCESS_BATCH_STATUSES.includes(batch.status);
  const removesAccess = hadAccess && !STUDENT_ACCESS_BATCH_STATUSES.includes(status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Batch name is required.');
    if (!startDate || !endDate) return setError('Start and end dates are required.');
    if (endDate < startDate) return setError('End date must not precede start date.');

    setPending(true);
    setError(null);
    try {
      const res = await updateBatchAction(batch.id, { name, startDate, endDate, status });
      if (res.success) {
        toast.success(res.message);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError('An unexpected error occurred while saving the batch.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => handleOpenChange(true)}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit batch
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Edit Batch</DialogTitle>
              <DialogDescription>
                Rename the batch, move its dates or change its status. College and program cannot be changed.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-batch-name">Batch name</Label>
              <Input
                id="edit-batch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-batch-start">Start date</Label>
                <Input
                  id="edit-batch-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-batch-end">End date</Label>
                <Input
                  id="edit-batch-end"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-batch-status">Status</Label>
              <Select value={status} onValueChange={(v) => isBatchStatus(v) && setStatus(v)}>
                <SelectTrigger id="edit-batch-status" aria-describedby="edit-batch-status-effect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p
                id="edit-batch-status-effect"
                className={
                  removesAccess
                    ? 'rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-foreground'
                    : 'text-xs text-muted-foreground'
                }
              >
                {removesAccess ? 'This removes student access. ' : ''}
                {STATUS_EFFECT[status]}
              </p>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
