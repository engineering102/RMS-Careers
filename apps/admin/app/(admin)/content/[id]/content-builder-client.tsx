'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  ContentItemWithDetails,
  ContentPlacement,
  ProjectAssignmentConfig,
  QuizWithDetails
} from '@/lib/db/queries';
import type { Program } from '@rms/db';
import { describeAudience } from '@/lib/content/audience';
import { CONTENT_TYPE_DEFS } from '@/lib/content/types/registry';
import { publishWarnings } from '@/lib/content/types/readiness';
import { updateContentLifecycleAction } from '../actions';
import { saveContentBuilderAction } from './actions';
import { initialForm, snapshot, toBuilderInput, type BuilderForm } from './builder-form';
import { TYPE_EDITORS } from './editors';
import { Field } from './editors/field';
import { StudentPreview } from './student-preview';

export type { BuilderForm, RubricRow } from './builder-form';

interface ContentBuilderClientProps {
  item: ContentItemWithDetails;
  programs: Program[];
  projectConfig: ProjectAssignmentConfig | null;
  quiz: QuizWithDetails | null;
  placements: ContentPlacement[];
}

const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?';

export function ContentBuilderClient({
  item: initialItem,
  programs,
  projectConfig,
  quiz,
  placements
}: ContentBuilderClientProps) {
  const router = useRouter();
  const [item, setItem] = React.useState(initialItem);
  const [form, setForm] = React.useState<BuilderForm>(() => initialForm(initialItem, projectConfig));
  const [savedSnapshot, setSavedSnapshot] = React.useState(() => snapshot(form));
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);
  const [pendingWarnings, setPendingWarnings] = React.useState<string[] | null>(null);

  const type = item.contentType;
  const def = CONTENT_TYPE_DEFS[type];
  const TypeEditor = TYPE_EDITORS[type];
  const isDirty = snapshot(form) !== savedSnapshot;
  const status = item.lifecycleStatus;

  const set = <K extends keyof BuilderForm>(key: K, value: BuilderForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((errors) => {
      const stale = Object.keys(errors).filter((k) => k === key || k.startsWith(`${key}.`));
      if (stale.length === 0) return errors;
      const next = { ...errors };
      for (const k of stale) delete next[k];
      return next;
    });
  };

  // Warn before leaving with unsaved edits: reloads and closing the tab...
  React.useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // ...and in-app links (sidebar, breadcrumbs, the workbench link), which never fire beforeunload.
  // Capture phase on document runs before React's handlers, so a cancelled click never reaches next/link.
  React.useEffect(() => {
    if (!isDirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isDirty]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setFieldErrors({});
    try {
      const res = await saveContentBuilderAction(toBuilderInput(item.id, type, form));
      if (!res.success) {
        setFieldErrors(res.fieldErrors ?? {});
        // The details were saved even though a later step failed; keep the form dirty so a retry saves the rest.
        if (res.savedItem) setItem(res.savedItem);
        toast.error(res.error);
        return;
      }
      setItem(res.item);
      setSavedSnapshot(snapshot(form));
      toast.success(
        res.item.lifecycleStatus === 'published' ? 'Saved. Students see these changes now.' : 'Saved as draft.'
      );
      router.refresh();
    } catch {
      toast.error('Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Ctrl/Cmd+S saves.
  const saveRef = React.useRef(handleSave);
  saveRef.current = handleSave;
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const changeStatus = async (action: 'publish' | 'unpublish') => {
    setIsChangingStatus(true);
    try {
      const res = await updateContentLifecycleAction(item.id, action);
      if (!res.success) {
        toast.error(res.error || 'Could not change the status.');
        return;
      }
      setItem(res.item);
      setPendingWarnings(null);
      toast.success(action === 'publish' ? 'Published. Students can now open it.' : 'Moved back to draft.');
      router.refresh();
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handlePublish = () => {
    if (isDirty) {
      toast.error('Save your changes before publishing.');
      return;
    }
    // The form equals the saved item here, so these checks describe what students will get.
    const warnings = publishWarnings({
      type,
      description: form.description,
      videoUrl: form.videoUrl,
      resourceLink: form.resourceLink,
      notes: form.notes,
      quizQuestionCount: quiz?.questionCount ?? 0,
      usesDefaultRubric: type === 'project' && (!projectConfig || projectConfig.rubricCriteria.length === 0),
      externalUrl: form.externalUrl,
      assessmentCode: form.assessmentCode
    });
    if (warnings.length > 0) {
      setPendingWarnings(warnings);
      return;
    }
    void changeStatus('publish');
  };

  const errorFor = (key: string) => fieldErrors[key]?.[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <PageHeader
        leading={
          <Link
            href="/content"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Content Library
          </Link>
        }
        eyebrow={`${def.label} builder`}
        title={form.title || 'Untitled'}
        actions={
          <>
            {status === 'draft' && (
              <Button variant="outline" onClick={handlePublish} disabled={isChangingStatus}>
                {isChangingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Publish
              </Button>
            )}
            {status === 'published' && (
              <Button variant="outline" onClick={() => changeStatus('unpublish')} disabled={isChangingStatus}>
                Unpublish
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving || !isDirty} title="Save (Ctrl+S)">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge status={status} />
          <span>{describeAudience(item, programs)}</span>
          {isDirty && <span className="font-medium text-warning">Unsaved changes</span>}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        {/* Editor: shared fields, then the type's own section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basics</CardTitle>
              <CardDescription>What students see in their library, batch workspace and page header.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field id="title" label="Title" error={errorFor('title')}>
                <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={255} />
              </Field>
              <Field
                id="description"
                label={def.descriptionLabel}
                hint={def.descriptionHint}
                error={errorFor('description')}
                counter={`${form.description.length}/2000`}
              >
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={type === 'project' ? 8 : 3}
                  maxLength={2000}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="topic" label="Topic" hint="Groups the item in the student library." error={errorFor('topic')}>
                  <Input
                    id="topic"
                    value={form.topic}
                    onChange={(e) => set('topic', e.target.value)}
                    placeholder="e.g. Arrays & Hashing"
                    maxLength={100}
                  />
                </Field>
                {def.hasDuration && (
                  <Field id="duration" label={def.durationLabel ?? 'Duration (minutes)'} error={errorFor('durationMinutes')}>
                    <Input
                      id="duration"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={1440}
                      value={form.durationMinutes}
                      onChange={(e) => set('durationMinutes', e.target.value)}
                      placeholder="e.g. 45"
                    />
                  </Field>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="scope"
                  label="Available to"
                  hint="Program items reach everyone in that program. Global items reach students only through batch curriculums."
                >
                  <Select value={form.programId} onValueChange={(v) => set('programId', v)}>
                    <SelectTrigger id="scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">All programs (global)</SelectItem>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.code ? `${p.code} · ${p.name}` : p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="slug"
                  label="Slug"
                  hint={
                    def.workflow === 'dsa-catalogue'
                      ? 'Must match the DSA sheet slug; students are sent to that sheet.'
                      : 'Lowercase letters, numbers and hyphens.'
                  }
                  error={errorFor('slug')}
                >
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => set('slug', e.target.value.toLowerCase())}
                    className="font-mono text-sm"
                    maxLength={120}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <TypeEditor
            item={item}
            form={form}
            set={set}
            errorFor={errorFor}
            projectConfig={projectConfig}
            quiz={quiz}
          />

          <PlacementCard placements={placements} />
        </div>

        {/* Preview */}
        <aside className="space-y-2 lg:sticky lg:top-6" aria-label="Student preview">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Student preview</h2>
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              Preview · nothing here is recorded
            </Badge>
          </div>
          <StudentPreview type={type} form={form} programs={programs} quiz={quiz} />
          <p className="text-xs text-muted-foreground">
            {type === 'quiz' ? 'Shows saved questions from the workbench.' : 'Updates as you type, before saving.'}
          </p>
          {type === 'lecture' && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              Custom players are not previewed here; check them in the student portal after saving.
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={pendingWarnings !== null}
        onOpenChange={(open) => !open && setPendingWarnings(null)}
        title="Publish anyway?"
        description="Students will be able to open this item, but it may not be ready yet:"
        confirmLabel="Publish anyway"
        pending={isChangingStatus}
        onConfirm={() => changeStatus('publish')}
      >
        <ul className="space-y-1.5 text-sm">
          {(pendingWarnings ?? []).map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              {w}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}

function PlacementCard({ placements }: { placements: ContentPlacement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Batch placement</CardTitle>
        <CardDescription>
          Week, order and dates are set per batch in its curriculum. Only published items can be placed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {placements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not placed in any batch curriculum yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {placements.map((p) => (
              <li key={p.batchId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <Link href={`/batches/${p.batchId}/curriculum`} className="font-medium text-foreground hover:underline">
                  {p.batchName}
                </Link>
                <span className="text-xs text-muted-foreground">
                  Week {p.weekNumber} · {p.isRequired ? 'Required' : 'Optional'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ContentItemWithDetails['lifecycleStatus'] }) {
  if (status === 'published') {
    return (
      <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
        Published
      </Badge>
    );
  }
  if (status === 'archived') {
    return (
      <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
        Archived
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
      Draft · hidden from students
    </Badge>
  );
}
