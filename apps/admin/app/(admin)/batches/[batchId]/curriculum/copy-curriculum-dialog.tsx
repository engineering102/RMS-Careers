'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { dayShiftBetween } from '@/lib/curriculum/copy-plan';
import { copyCurriculumFromBatchAction } from './actions';

export interface CopySourceBatch {
  id: string;
  name: string;
  status: string;
  startDate: Date | string | null;
}

const toDate = (value: Date | string | null) => (value ? new Date(value) : null);

/**
 * Copies another batch's curriculum into this one in a single step, instead of placing every item by
 * hand. Source batches are limited to the same program, so their content is eligible here.
 */
export function CopyCurriculumDialog({
  batchId,
  batchStartDate,
  sourceBatches,
  variant = 'outline'
}: {
  batchId: string;
  batchStartDate: Date | string | null;
  sourceBatches: CopySourceBatch[];
  variant?: 'outline' | 'default';
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [sourceId, setSourceId] = React.useState('');
  const [shiftDates, setShiftDates] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  const source = sourceBatches.find((b) => b.id === sourceId);
  const shiftDays = source ? dayShiftBetween(toDate(source.startDate), toDate(batchStartDate)) : null;
  const canShift = shiftDays !== null;

  const handleCopy = async () => {
    if (!sourceId) return;
    setPending(true);
    try {
      const res = await copyCurriculumFromBatchAction(batchId, { sourceBatchId: sourceId, shiftDates: shiftDates && canShift });
      if (res.success) {
        const { copied, skipped } = res.data;
        const skippedTotal = skipped.alreadyPlaced + skipped.notPublished + skipped.otherProgram;
        toast.success(
          `Copied ${copied} ${copied === 1 ? 'item' : 'items'}.` +
            (skippedTotal > 0
              ? ` Skipped ${skippedTotal}: ${skipped.alreadyPlaced} already here, ${skipped.notPublished} not published, ${skipped.otherProgram} from another program.`
              : '')
        );
        setOpen(false);
        setSourceId('');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('An unexpected error occurred while copying the curriculum.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button type="button" variant={variant} className="h-9 gap-2 text-xs" onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy from batch
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Curriculum from Another Batch</DialogTitle>
            <DialogDescription>
              Adds the other batch&apos;s placements to this batch with the same weeks, order and required flags. Items
              already placed here are left as they are; nothing is removed.
            </DialogDescription>
          </DialogHeader>

          {sourceBatches.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              There is no other batch in this program to copy from yet.
            </p>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="copy-source-batch">Copy from</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger id="copy-source-batch">
                    <SelectValue placeholder="Choose a batch of this program" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceBatches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={shiftDates && canShift}
                  disabled={!canShift}
                  onChange={(e) => setShiftDates(e.target.checked)}
                />
                <span>
                  Keep availability and due dates, moved to this batch&apos;s timeline
                  <span className="block text-xs text-muted-foreground">
                    {!source
                      ? 'Choose a batch to see how far the dates move.'
                      : canShift
                        ? shiftDays === 0
                          ? 'Both batches start on the same day, so dates are copied unchanged.'
                          : `Dates move ${Math.abs(shiftDays!)} ${Math.abs(shiftDays!) === 1 ? 'day' : 'days'} ${shiftDays! > 0 ? 'later' : 'earlier'}, the gap between the two start dates.`
                        : 'One of the batches has no start date, so items are copied without dates.'}
                    {' '}Unticked, items are copied without dates.
                  </span>
                </span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCopy} disabled={pending || !sourceId}>
              {pending ? 'Copying…' : 'Copy curriculum'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
