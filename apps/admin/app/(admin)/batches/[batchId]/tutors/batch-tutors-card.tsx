'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils/format-date';
import type { BatchTutorItem } from '@/lib/db/queries';
import { assignTutorAction, unassignTutorAction } from './actions';

const STATE_LABEL: Record<BatchTutorItem['state'], string> = {
  pending_activation: 'Invited',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended'
};

/** Tutors who can see this batch in the Tutor Portal, with assign / unassign. */
export function BatchTutorsCard({
  batchId,
  batchName,
  assigned,
  assignable
}: {
  batchId: string;
  batchName: string;
  assigned: BatchTutorItem[];
  assignable: Array<{ tutorId: string; fullName: string; email: string }>;
}) {
  const [selectedTutorId, setSelectedTutorId] = useState<string>('');
  const [pending, setPending] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<BatchTutorItem | null>(null);

  const assignedIds = new Set(assigned.map((t) => t.tutorId));
  const options = assignable.filter((t) => !assignedIds.has(t.tutorId));

  const handleAssign = async () => {
    if (!selectedTutorId) return;
    setPending(true);
    const res = await assignTutorAction(batchId, selectedTutorId);
    setPending(false);
    if (res.success) {
      toast.success(res.message);
      setSelectedTutorId('');
    } else {
      toast.error(res.error);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setPending(true);
    const res = await unassignTutorAction(batchId, removeTarget.tutorId);
    setPending(false);
    if (res.success) {
      toast.success(res.message);
      setRemoveTarget(null);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <section aria-labelledby="batch-tutors-heading" className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="batch-tutors-heading" className="text-lg font-semibold">
            Tutors
          </h2>
          <p className="text-sm text-muted-foreground">Assigned tutors review this batch&apos;s projects in the Tutor Portal.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="assign-tutor" className="sr-only">
            Tutor to assign
          </label>
          <Select value={selectedTutorId} onValueChange={setSelectedTutorId} disabled={pending || options.length === 0}>
            <SelectTrigger id="assign-tutor" className="h-9 w-56">
              <SelectValue placeholder={options.length === 0 ? 'No tutors to assign' : 'Choose a tutor'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((t) => (
                <SelectItem key={t.tutorId} value={t.tutorId}>
                  {t.fullName} ({t.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9 gap-1.5" onClick={handleAssign} disabled={pending || !selectedTutorId}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Assign
          </Button>
        </div>
      </div>

      {assigned.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tutors assigned yet.{' '}
          {assignable.length === 0 && (
            <>
              <Link href="/tutors" className="font-medium text-primary underline-offset-4 hover:underline">
                Create a tutor
              </Link>{' '}
              first.
            </>
          )}
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {assigned.map((t) => (
            <li key={t.tutorId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{t.fullName}</span>{' '}
                <span className="text-muted-foreground">{t.email}</span>
                <span className="block text-xs text-muted-foreground">Assigned {formatDate(t.assignedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.state === 'active' ? 'default' : t.state === 'pending_activation' ? 'secondary' : 'outline'}>
                  {STATE_LABEL[t.state]}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setRemoveTarget(t)}
                  aria-label={`Remove ${t.fullName} from ${batchName}`}
                >
                  <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={removeTarget ? `Remove ${removeTarget.fullName} from ${batchName}?` : ''}
        description="The tutor loses access to this batch in the Tutor Portal on their next request. Reviews they already made are kept."
        confirmLabel="Remove"
        pendingLabel="Removing…"
        variant="destructive"
        pending={pending}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
