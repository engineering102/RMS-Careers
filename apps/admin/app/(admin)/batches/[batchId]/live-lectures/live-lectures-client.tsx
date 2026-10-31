'use client';

import { useState } from 'react';
import { PlusCircle, Video, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/admin/empty-state';
import {
  WEEKDAY_LABELS,
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  describeSchedule,
  formatIstDateTime,
  maskMeetingUrl,
  nextOccurrence,
  hasEnded
} from '@rms/academic/live-sessions';
import {
  createLiveSessionAction,
  updateLiveSessionAction,
  setLiveSessionPublishedAction,
  deleteLiveSessionAction
} from './actions';

export interface LiveSessionRow {
  id: string;
  title: string;
  description: string | null;
  meetingUrl: string;
  joiningInstructions: string | null;
  recurrenceDays: number[];
  startTime: string;
  durationMinutes: number;
  startsOn: string | null;
  endsOn: string | null;
  isPublished: boolean;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];

interface FormState {
  title: string;
  description: string;
  meetingUrl: string;
  joiningInstructions: string;
  recurrenceDays: number[];
  startTime: string;
  durationMinutes: string;
  startsOn: string;
  endsOn: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  meetingUrl: '',
  joiningInstructions: '',
  recurrenceDays: [],
  startTime: '19:00',
  durationMinutes: '60',
  startsOn: '',
  endsOn: '',
  isPublished: false
};

function toForm(s: LiveSessionRow): FormState {
  return {
    title: s.title,
    description: s.description ?? '',
    meetingUrl: s.meetingUrl,
    joiningInstructions: s.joiningInstructions ?? '',
    recurrenceDays: s.recurrenceDays,
    startTime: s.startTime,
    durationMinutes: String(s.durationMinutes),
    startsOn: s.startsOn ?? '',
    endsOn: s.endsOn ?? '',
    isPublished: s.isPublished
  };
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {errors[0]}
    </p>
  );
}

export function LiveLecturesClient({
  batchId,
  batchName,
  sessions,
  nowIso
}: {
  batchId: string;
  batchName: string;
  sessions: LiveSessionRow[];
  /** Server render time, so "Next:" is the same on the server and in the browser. */
  nowIso: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSessionRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LiveSessionRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = new Date(nowIso);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (s: LiveSessionRow) => {
    setEditing(s);
    setForm(toForm(s));
    setFieldErrors({});
    setFormOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleDay = (day: number) =>
    setForm((f) => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(day) ? f.recurrenceDays.filter((d) => d !== day) : [...f.recurrenceDays, day]
    }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const input = {
      ...form,
      durationMinutes: form.durationMinutes.trim() === '' ? Number.NaN : Number(form.durationMinutes)
    };
    const res = editing ? await updateLiveSessionAction(batchId, editing.id, input) : await createLiveSessionAction(batchId, input);
    setSaving(false);
    if (res.success) {
      toast.success(editing ? 'Live session updated' : 'Live session created');
      setFormOpen(false);
    } else {
      setFieldErrors(res.fieldErrors ?? {});
      toast.error(res.error);
    }
  };

  const togglePublished = async (s: LiveSessionRow) => {
    setBusyId(s.id);
    const res = await setLiveSessionPublishedAction(batchId, s.id, !s.isPublished);
    setBusyId(null);
    if (res.success) toast.success(s.isPublished ? 'Hidden from students and tutors' : 'Published to students and tutors');
    else toast.error(res.error);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    const res = await deleteLiveSessionAction(batchId, deleteTarget.id);
    setBusyId(null);
    if (res.success) {
      toast.success('Live session deleted');
      setDeleteTarget(null);
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Times are in IST. Single sessions cannot be cancelled or moved: edit the days or dates, or unpublish the session.
        </p>
        <Button size="sm" className="h-9 gap-1.5" onClick={openCreate}>
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          New Live Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No live sessions yet"
          description="Add a weekly Zoom session for this batch. It stays hidden from students until you publish it."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => {
            const next = nextOccurrence(s, now);
            const ended = hasEnded(s, now);
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{s.title}</h3>
                    <Badge variant={s.isPublished ? 'default' : 'outline'}>{s.isPublished ? 'Published' : 'Draft'}</Badge>
                    {ended && <Badge variant="secondary">Ended</Badge>}
                  </div>
                  <p className="text-sm">{describeSchedule(s)}</p>
                  <p className="text-xs text-muted-foreground">
                    {next ? `Next: ${formatIstDateTime(next.start)}` : ended ? `Schedule ended ${s.endsOn}` : 'No upcoming session'}
                    {s.startsOn && s.startsOn !== s.endsOn ? ` · from ${s.startsOn}` : ''}
                    {s.endsOn && s.startsOn !== s.endsOn ? ` · until ${s.endsOn}` : ''}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{maskMeetingUrl(s.meetingUrl)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    disabled={busyId === s.id}
                    onClick={() => togglePublished(s)}
                  >
                    {s.isPublished ? <EyeOff className="h-3 w-3" aria-hidden="true" /> : <Eye className="h-3 w-3" aria-hidden="true" />}
                    {s.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs text-destructive"
                    onClick={() => setDeleteTarget(s)}
                    aria-label={`Delete ${s.title}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <form onSubmit={handleSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Live Session' : 'New Live Session'}</DialogTitle>
              <DialogDescription>{batchName}. Times are in IST.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="ls-title" className="text-sm font-medium">
                  Title *
                </label>
                <Input id="ls-title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={200} aria-describedby="ls-title-error" />
                <FieldError id="ls-title-error" errors={fieldErrors.title} />
              </div>

              <div className="grid gap-2">
                <label htmlFor="ls-url" className="text-sm font-medium">
                  Zoom meeting link *
                </label>
                <Input
                  id="ls-url"
                  type="url"
                  placeholder="https://zoom.us/j/1234567890?pwd=…"
                  value={form.meetingUrl}
                  onChange={(e) => set('meetingUrl', e.target.value)}
                  aria-describedby="ls-url-hint ls-url-error"
                />
                <p id="ls-url-hint" className="text-xs text-muted-foreground">
                  The join link students and tutors use. Tutors host through Zoom&apos;s alternative-host setting; host links are not stored.
                </p>
                <FieldError id="ls-url-error" errors={fieldErrors.meetingUrl} />
              </div>

              <fieldset className="grid gap-2" aria-describedby="ls-days-error">
                <legend className="text-sm font-medium">Days *</legend>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                      <input type="checkbox" checked={form.recurrenceDays.includes(day)} onChange={() => toggleDay(day)} />
                      {WEEKDAY_LABELS[day]}
                    </label>
                  ))}
                </div>
                <FieldError id="ls-days-error" errors={fieldErrors.recurrenceDays} />
              </fieldset>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="ls-start" className="text-sm font-medium">
                    Start time (IST) *
                  </label>
                  <Input id="ls-start" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} aria-describedby="ls-start-error" />
                  <FieldError id="ls-start-error" errors={fieldErrors.startTime} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="ls-duration" className="text-sm font-medium">
                    Duration (minutes) *
                  </label>
                  <Input
                    id="ls-duration"
                    type="number"
                    min={MIN_DURATION_MINUTES}
                    max={MAX_DURATION_MINUTES}
                    value={form.durationMinutes}
                    onChange={(e) => set('durationMinutes', e.target.value)}
                    aria-describedby="ls-duration-error"
                  />
                  <FieldError id="ls-duration-error" errors={fieldErrors.durationMinutes} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="ls-starts-on" className="text-sm font-medium">
                    Starts on
                  </label>
                  <Input id="ls-starts-on" type="date" value={form.startsOn} onChange={(e) => set('startsOn', e.target.value)} aria-describedby="ls-starts-on-error" />
                  <FieldError id="ls-starts-on-error" errors={fieldErrors.startsOn} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="ls-ends-on" className="text-sm font-medium">
                    Ends on
                  </label>
                  <Input id="ls-ends-on" type="date" value={form.endsOn} onChange={(e) => set('endsOn', e.target.value)} aria-describedby="ls-ends-on-error" />
                  <FieldError id="ls-ends-on-error" errors={fieldErrors.endsOn} />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Leave both empty for an open-ended weekly session. For a one-off session, use the same date for both and tick that date&apos;s weekday.
              </p>

              <div className="grid gap-2">
                <label htmlFor="ls-description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="ls-description"
                  rows={2}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="ls-instructions" className="text-sm font-medium">
                  Joining instructions
                </label>
                <textarea
                  id="ls-instructions"
                  rows={2}
                  maxLength={2000}
                  value={form.joiningInstructions}
                  onChange={(e) => set('joiningInstructions', e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
                Published (visible to students and assigned tutors)
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={deleteTarget ? `Delete ${deleteTarget.title}?` : ''}
        description="Students and tutors will no longer see this session. To hide it temporarily, unpublish it instead."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        variant="destructive"
        pending={busyId === deleteTarget?.id}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
