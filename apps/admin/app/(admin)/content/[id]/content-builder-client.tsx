'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileQuestion,
  Loader2,
  Plus,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ContentItemWithDetails, ProjectAssignmentConfig } from '@/lib/db/queries';
import type { Program, ContentTypeEnum } from '@rms/db';
import { readAuthoringFields } from '@/lib/content/student-metadata';
import { describeAudience } from '@/lib/content/audience';
import { DEFAULT_PROJECT_RUBRIC, rubricMaxScore } from '@/lib/content/project-rubric';
import { updateContentLifecycleAction } from '../actions';
import { saveContentBuilderAction } from './actions';
import { StudentPreview } from './student-preview';

const TYPE_LABELS: Record<ContentTypeEnum, string> = {
  lecture: 'Lecture',
  notes: 'Notes / Reading',
  dsa_sheet: 'DSA Sheet',
  quiz: 'Quiz',
  project: 'Project',
  resource: 'Resource'
};

export interface RubricRow {
  key: string;
  title: string;
  maxPoints: string;
  description: string;
}

export interface BuilderForm {
  title: string;
  slug: string;
  description: string;
  programId: string;
  topic: string;
  videoUrl: string;
  resourceLink: string;
  notes: string;
  durationMinutes: string;
  rubric: RubricRow[];
}

interface ContentBuilderClientProps {
  item: ContentItemWithDetails;
  programs: Program[];
  projectConfig: ProjectAssignmentConfig | null;
}

let rubricKeySeed = 0;
const rubricKey = () => `criterion-${++rubricKeySeed}`;

function initialForm(item: ContentItemWithDetails, projectConfig: ProjectAssignmentConfig | null): BuilderForm {
  const fields = readAuthoringFields(item.metadata);
  const rubricSource =
    projectConfig && projectConfig.rubricCriteria.length > 0 ? projectConfig.rubricCriteria : DEFAULT_PROJECT_RUBRIC;
  return {
    title: item.title,
    slug: item.slug,
    description: item.description ?? '',
    programId: item.programId === null ? 'global' : String(item.programId),
    topic: fields.topic,
    videoUrl: fields.videoUrl,
    resourceLink: fields.resourceLink,
    notes: fields.notes,
    durationMinutes: fields.durationMinutes === null ? '' : String(fields.durationMinutes),
    rubric:
      item.contentType === 'project'
        ? rubricSource.map((c) => ({
            key: rubricKey(),
            title: c.title,
            maxPoints: String(c.maxPoints),
            description: c.description ?? ''
          }))
        : []
  };
}

/** Comparable snapshot without React keys, for unsaved-change detection. */
const snapshot = (form: BuilderForm) =>
  JSON.stringify({ ...form, rubric: form.rubric.map(({ key: _key, ...rest }) => rest) });

export function ContentBuilderClient({ item: initialItem, programs, projectConfig }: ContentBuilderClientProps) {
  const router = useRouter();
  const [item, setItem] = React.useState(initialItem);
  const [form, setForm] = React.useState<BuilderForm>(() => initialForm(initialItem, projectConfig));
  const [savedSnapshot, setSavedSnapshot] = React.useState(() => snapshot(form));
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);

  const type = item.contentType;
  const isDirty = snapshot(form) !== savedSnapshot;
  const status = item.lifecycleStatus;
  const usesDefaultRubric = type === 'project' && (!projectConfig || projectConfig.rubricCriteria.length === 0);

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

  // Warn before leaving with unsaved edits.
  React.useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setFieldErrors({});
    try {
      const duration = form.durationMinutes.trim();
      const res = await saveContentBuilderAction({
        id: item.id,
        title: form.title,
        slug: form.slug,
        description: form.description,
        programId: form.programId === 'global' ? null : Number(form.programId),
        topic: form.topic,
        videoUrl: form.videoUrl,
        resourceLink: form.resourceLink,
        notes: form.notes,
        durationMinutes: duration === '' ? null : Number(duration),
        rubric:
          type === 'project'
            ? form.rubric.map((r) => ({
                title: r.title,
                maxPoints: Number(r.maxPoints),
                description: r.description
              }))
            : undefined
      });
      if (!res.success) {
        setFieldErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setItem(res.item);
      setSavedSnapshot(snapshot(form));
      toast.success('Saved. Students see these changes now.');
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

  const handleLifecycle = async (action: 'publish' | 'unpublish') => {
    if (action === 'publish' && isDirty) {
      toast.error('Save your changes before publishing.');
      return;
    }
    setIsChangingStatus(true);
    try {
      const res = await updateContentLifecycleAction(item.id, action);
      if (!res.success) {
        toast.error(res.error || 'Could not change the status.');
        return;
      }
      setItem(res.item);
      toast.success(action === 'publish' ? 'Published. Students can now open it.' : 'Moved back to draft.');
      router.refresh();
    } finally {
      setIsChangingStatus(false);
    }
  };

  const updateRubric = (key: string, patch: Partial<RubricRow>) => {
    set(
      'rubric',
      form.rubric.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };
  const moveRubric = (index: number, delta: -1 | 1) => {
    const next = [...form.rubric];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('rubric', next);
  };

  const rubricTotal = rubricMaxScore(
    form.rubric.map((r) => ({ maxPoints: Number.isFinite(Number(r.maxPoints)) ? Number(r.maxPoints) : 0 }))
  );
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
        eyebrow={`${TYPE_LABELS[type]} builder`}
        title={form.title || 'Untitled'}
        actions={
          <>
            {status === 'draft' && (
              <Button variant="outline" onClick={() => handleLifecycle('publish')} disabled={isChangingStatus}>
                {isChangingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Publish
              </Button>
            )}
            {status === 'published' && (
              <Button variant="outline" onClick={() => handleLifecycle('unpublish')} disabled={isChangingStatus}>
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
        {/* Editor */}
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
                label={type === 'project' ? 'Project brief' : 'Description'}
                hint={
                  type === 'project'
                    ? 'What to build, the requirements, and what to submit. Shown at the top of the project page.'
                    : 'A short summary shown under the title.'
                }
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
                {(type === 'lecture' || type === 'notes' || type === 'resource') && (
                  <Field
                    id="duration"
                    label={type === 'lecture' ? 'Duration (minutes)' : 'Reading time (minutes)'}
                    error={errorFor('durationMinutes')}
                  >
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
                    type === 'dsa_sheet'
                      ? 'Must match the DSA topic slug; students are sent to that topic.'
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

          {type === 'lecture' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video</CardTitle>
                <CardDescription>
                  Paste a YouTube or Vimeo link (any format: watch, share, shorts, embed). Other players need an
                  https embed URL.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field id="videoUrl" label="Video link" error={errorFor('videoUrl')}>
                  <Input
                    id="videoUrl"
                    value={form.videoUrl}
                    onChange={(e) => set('videoUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {(type === 'notes' || type === 'resource') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reading material</CardTitle>
                <CardDescription>Add a link to a document, written notes, or both.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field
                  id="resourceLink"
                  label="Document link"
                  hint="Google Docs, Drive, Notion, GitHub, slides… Students get an “Open Resource” button."
                  error={errorFor('resourceLink')}
                >
                  <Input
                    id="resourceLink"
                    value={form.resourceLink}
                    onChange={(e) => set('resourceLink', e.target.value)}
                    placeholder="https://"
                  />
                </Field>
                <Field
                  id="notes"
                  label="Notes"
                  hint="Shown as plain text. Line breaks and indentation are kept as you type them."
                  error={errorFor('notes')}
                  counter={`${form.notes.length.toLocaleString('en-IN')} characters`}
                >
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    rows={16}
                    className="font-mono text-sm leading-relaxed"
                    placeholder={'Key ideas\n- …\n\nWorked example\n…'}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {type === 'project' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grading rubric</CardTitle>
                <CardDescription>
                  Students see these criteria while they work; reviewers score against them. The project is out of{' '}
                  <span className="font-semibold text-foreground">{rubricTotal} points</span>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {usesDefaultRubric && (
                  <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    This project has no rubric of its own yet, so students see the default below. Edit it and save to
                    make it this project&apos;s rubric.
                  </p>
                )}
                {projectConfig && projectConfig.submissionCount > 0 && (
                  <p className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    {projectConfig.submissionCount} submission{projectConfig.submissionCount === 1 ? ' has' : 's have'}{' '}
                    already been made. Changing the rubric does not change scores already given.
                  </p>
                )}
                {errorFor('rubric') && <p className="text-sm text-destructive">{errorFor('rubric')}</p>}
                <ol className="space-y-3">
                  {form.rubric.map((row, index) => (
                    <li key={row.key} className="rounded-lg border border-border p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-5 shrink-0 text-xs font-semibold text-muted-foreground">
                          {index + 1}.
                        </span>
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_6rem]">
                          <Input
                            aria-label={`Criterion ${index + 1} title`}
                            value={row.title}
                            onChange={(e) => updateRubric(row.key, { title: e.target.value })}
                            placeholder="Criterion, e.g. Feature completeness"
                            maxLength={120}
                          />
                          <div className="relative">
                            <Input
                              aria-label={`Criterion ${index + 1} points`}
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={1000}
                              value={row.maxPoints}
                              onChange={(e) => updateRubric(row.key, { maxPoints: e.target.value })}
                              className="pr-9"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              pts
                            </span>
                          </div>
                          <Textarea
                            aria-label={`Criterion ${index + 1} description`}
                            value={row.description}
                            onChange={(e) => updateRubric(row.key, { description: e.target.value })}
                            placeholder="What earns full marks (optional)"
                            rows={2}
                            maxLength={500}
                            className="sm:col-span-2"
                          />
                          {(['title', 'maxPoints', 'description'] as const).map((field) => {
                            const message = errorFor(`rubric.${index}.${field}`);
                            return message ? (
                              <p key={field} className="text-xs text-destructive sm:col-span-2" role="alert">
                                {message}
                              </p>
                            ) : null;
                          })}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveRubric(index, -1)}
                            disabled={index === 0}
                            aria-label={`Move criterion ${index + 1} up`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveRubric(index, 1)}
                            disabled={index === form.rubric.length - 1}
                            aria-label={`Move criterion ${index + 1} down`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => set('rubric', form.rubric.filter((r) => r.key !== row.key))}
                            disabled={form.rubric.length === 1}
                            aria-label={`Remove criterion ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    set('rubric', [...form.rubric, { key: rubricKey(), title: '', maxPoints: '10', description: '' }])
                  }
                  disabled={form.rubric.length >= 12}
                >
                  <Plus className="h-4 w-4" />
                  Add criterion
                </Button>
              </CardContent>
            </Card>
          )}

          {type === 'quiz' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Questions</CardTitle>
                <CardDescription>
                  Questions, timing, pass mark and explanations are managed in the quiz workbench.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={`/content/${item.id}/quiz`}>
                    <FileQuestion className="h-4 w-4" />
                    Open quiz workbench
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {type === 'dsa_sheet' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">DSA topic</CardTitle>
                <CardDescription>
                  Problems for DSA topics live in the student portal&apos;s DSA catalogue. This item links students to
                  the topic whose slug is <span className="font-mono text-foreground">{form.slug || '…'}</span>.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Preview */}
        <aside className="space-y-2 lg:sticky lg:top-6" aria-label="Student preview">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Student preview</h2>
            <span className="text-xs text-muted-foreground">Updates as you type</span>
          </div>
          <StudentPreview type={type} form={form} programs={programs} />
          {type === 'lecture' && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              Custom players are not previewed here; check them in the student portal after saving.
            </p>
          )}
        </aside>
      </div>
    </div>
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

function Field({
  id,
  label,
  hint,
  error,
  counter,
  children
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {counter && <span className="text-xs text-muted-foreground">{counter}</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
