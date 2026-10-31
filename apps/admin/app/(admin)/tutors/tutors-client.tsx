'use client';

import { useState } from 'react';
import { PlusCircle, UserCog, Mail, Power } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import type { TutorListItem } from '@/lib/db/queries';
import {
  createTutorAction,
  resendTutorInvitationAction,
  setTutorActiveAction,
  type InvitationNotSent
} from './actions';

const STATE_LABEL: Record<TutorListItem['state'], string> = {
  pending_activation: 'Invited',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended'
};

const NOT_SENT_MESSAGE: Record<InvitationNotSent, string> = {
  portal_not_live:
    'No invitation email was sent: the tutor portal is not live yet. Use "Resend invitation" after launch.',
  provider_not_configured: 'No invitation email was sent: email delivery is not configured. Use "Resend invitation" later.',
  delivery_failed: 'The invitation email could not be delivered. Use "Resend invitation" to try again.'
};

function reportDelivery(prefix: string, data: { emailSent: true } | { emailSent: false; reason: InvitationNotSent }) {
  if (data.emailSent) toast.success(`${prefix} Invitation email sent.`);
  else toast.warning(`${prefix} ${NOT_SENT_MESSAGE[data.reason]}`);
}

export function TutorsClient({
  initialTutors,
  invitationsEnabled
}: {
  initialTutors: TutorListItem[];
  invitationsEnabled: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState<TutorListItem | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const openCreate = () => {
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const res = await createTutorAction(new FormData(e.currentTarget));
    setLoading(false);
    if (res.success) {
      reportDelivery('Tutor account created.', res.data);
      setFormOpen(false);
    } else {
      setFieldErrors(res.fieldErrors ?? {});
      toast.error(res.error || 'Failed to create tutor');
    }
  };

  const handleResend = async (tutor: TutorListItem) => {
    setResendingId(tutor.tutorId);
    const res = await resendTutorInvitationAction(tutor.tutorId);
    setResendingId(null);
    if (res.success) reportDelivery('New invitation issued.', res.data);
    else toast.error(res.error);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setLoading(true);
    const deactivating = statusTarget.state !== 'inactive';
    const res = await setTutorActiveAction(statusTarget.tutorId, !deactivating);
    setLoading(false);
    if (res.success) {
      toast.success(deactivating ? 'Tutor deactivated' : 'Tutor reactivated');
      setStatusTarget(null);
    } else {
      toast.error(res.error || 'Failed to update tutor');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tutors</h1>
          <p className="text-sm text-muted-foreground">
            Tutor accounts for the Tutor Portal. Assign tutors to batches from each batch&apos;s overview page.
          </p>
        </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>New Tutor</span>
        </Button>
      </div>

      {!invitationsEnabled && (
        <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
          The Tutor Portal is not live yet, so invitation emails are not sent. Accounts are created as &quot;Invited&quot;;
          send their invitations with &quot;Resend invitation&quot; after launch.
        </p>
      )}

      {initialTutors.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Add your first tutor"
          description="Create a tutor account, then assign the tutor to one or more batches."
          action={
            <Button size="sm" variant="outline" onClick={openCreate} className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Create Tutor
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Batches</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialTutors.map((tutor) => (
                <TableRow key={tutor.tutorId}>
                  <TableCell className="font-medium">
                    {tutor.fullName}
                    {tutor.headline && <span className="block text-xs font-normal text-muted-foreground">{tutor.headline}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tutor.email}</TableCell>
                  <TableCell>
                    <Badge variant={tutor.state === 'active' ? 'default' : tutor.state === 'pending_activation' ? 'secondary' : 'outline'}>
                      {STATE_LABEL[tutor.state]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{tutor.assignedBatchCount}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(tutor.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {tutor.state === 'pending_activation' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-xs"
                          disabled={!invitationsEnabled || resendingId === tutor.tutorId}
                          onClick={() => handleResend(tutor)}
                        >
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {resendingId === tutor.tutorId ? 'Sending…' : 'Resend invitation'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setStatusTarget(tutor)}
                      >
                        <Power className="h-3 w-3" aria-hidden="true" />
                        {tutor.state === 'inactive' ? 'Reactivate' : 'Deactivate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Tutor</DialogTitle>
              <DialogDescription>
                The tutor sets their own password from the invitation email. Use an email that is not used by a student or
                an administrator.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="tutor-full-name" className="text-sm font-medium">
                  Full name *
                </label>
                <Input id="tutor-full-name" name="fullName" required maxLength={120} aria-describedby="tutor-full-name-error" />
                {fieldErrors.fullName && (
                  <p id="tutor-full-name-error" className="text-xs text-destructive">
                    {fieldErrors.fullName[0]}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="tutor-email" className="text-sm font-medium">
                  Email *
                </label>
                <Input id="tutor-email" name="email" type="email" required maxLength={254} aria-describedby="tutor-email-error" />
                {fieldErrors.email && (
                  <p id="tutor-email-error" className="text-xs text-destructive">
                    {fieldErrors.email[0]}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <label htmlFor="tutor-headline" className="text-sm font-medium">
                  Headline
                </label>
                <Input id="tutor-headline" name="headline" maxLength={160} placeholder="e.g. Senior Backend Engineer" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create Tutor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        title={statusTarget ? `${statusTarget.state === 'inactive' ? 'Reactivate' : 'Deactivate'} ${statusTarget.fullName}?` : ''}
        description={
          statusTarget?.state === 'inactive'
            ? 'The tutor regains Tutor Portal access to the batches they are still assigned to.'
            : 'The tutor loses Tutor Portal access on their next request. Batch assignments and the reviews they made are kept. You can reactivate them at any time.'
        }
        confirmLabel={statusTarget?.state === 'inactive' ? 'Reactivate' : 'Deactivate'}
        pendingLabel="Updating…"
        variant={statusTarget?.state === 'inactive' ? 'default' : 'destructive'}
        pending={loading}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
