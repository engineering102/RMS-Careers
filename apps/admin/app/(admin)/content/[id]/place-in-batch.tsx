'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addContentToBatchAction } from '../../batches/[batchId]/curriculum/actions';

export interface PlaceableBatch {
  id: string;
  name: string;
  programCode: string;
}

/**
 * Places this item into a batch's curriculum without leaving the builder. Dates and order are then
 * fine-tuned in that batch's curriculum page.
 */
export function PlaceInBatch({
  contentItemId,
  batches,
  blockedReason
}: {
  contentItemId: string;
  /** Draft or active batches this item may go into and is not in yet. */
  batches: PlaceableBatch[];
  /** Why placing is not possible right now (draft item, unsaved changes); null when it is. */
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [batchId, setBatchId] = React.useState('');
  const [week, setWeek] = React.useState('1');
  const [isRequired, setIsRequired] = React.useState(true);
  const [pending, setPending] = React.useState(false);

  if (batches.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        There is no other draft or active batch this item can be added to.
      </p>
    );
  }

  const weekNumber = Number(week);
  const weekValid = Number.isInteger(weekNumber) && weekNumber >= 1 && weekNumber <= 104;

  const handlePlace = async () => {
    if (!batchId || !weekValid) return;
    setPending(true);
    try {
      const res = await addContentToBatchAction(batchId, { contentItemId, weekNumber, isRequired });
      if (res.success) {
        const batch = batches.find((b) => b.id === batchId);
        toast.success(`Added to ${batch?.name ?? 'the batch'}, week ${weekNumber}.`);
        setBatchId('');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error('An unexpected error occurred while adding to the batch.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-3">
      <p className="text-sm font-medium">Add to a batch</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
        <div className="grid gap-1.5">
          <Label htmlFor="place-batch" className="text-xs">
            Batch
          </Label>
          <Select value={batchId} onValueChange={setBatchId} disabled={Boolean(blockedReason)}>
            <SelectTrigger id="place-batch" className="h-9">
              <SelectValue placeholder="Choose a batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} ({b.programCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="place-week" className="text-xs">
            Week
          </Label>
          <Input
            id="place-week"
            type="number"
            inputMode="numeric"
            min={1}
            max={104}
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="h-9"
            disabled={Boolean(blockedReason)}
            aria-invalid={!weekValid}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            disabled={Boolean(blockedReason)}
          />
          Required for students
        </label>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={handlePlace}
          disabled={pending || Boolean(blockedReason) || !batchId || !weekValid}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          {pending ? 'Adding…' : 'Add to batch'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {blockedReason ?? 'It goes to the end of that week. Set dates and order in the batch curriculum.'}
      </p>
    </div>
  );
}
