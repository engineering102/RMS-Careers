'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Program } from '@rms/db';
import { CONTENT_SUBJECTS, contentSubjectLabel, resolveContentSubject } from '@rms/db/content-subjects';
import { CONTENT_TYPE_DEFS, CREATE_CHOICES, type CreateChoiceId } from '@/lib/content/types/registry';
import { parseVideoUrl } from '@/lib/content/video-url';
import { createContentAction } from './actions';
import { ContentTypePicker } from './content-type-picker';
import { Field } from './[id]/editors/field';

/** Everything the details step can collect. Only the chosen type's fields are sent. */
export interface CreateForm {
  title: string;
  slug: string;
  description: string;
  programId: string;
  topic: string;
  /** Subject slug, or '' for Auto. */
  subject: string;
  inLibrary: boolean;
  videoUrl: string;
  resourceLink: string;
  notes: string;
  durationMinutes: string;
  externalProvider: string;
  externalUrl: string;
  assessmentCode: string;
  isPublished: boolean;
}

const EMPTY_FORM: CreateForm = {
  title: '',
  slug: '',
  description: '',
  programId: 'global',
  topic: '',
  subject: '',
  inLibrary: false,
  videoUrl: '',
  resourceLink: '',
  notes: '',
  durationMinutes: '',
  externalProvider: 'QwikTest',
  externalUrl: '',
  assessmentCode: '',
  isPublished: false
};

const PROVIDER_NAMES = { youtube: 'YouTube', vimeo: 'Vimeo', custom: 'Custom player' } as const;

const text = (value: string) => (value.trim() ? value.trim() : undefined);

/** The createContentAction payload for a choice: fields of other types are left out. */
export function toCreateInput(choiceId: CreateChoiceId, form: CreateForm) {
  const choice = CREATE_CHOICES.find((c) => c.id === choiceId) ?? CREATE_CHOICES[0];
  const type = choice.contentType;
  const def = CONTENT_TYPE_DEFS[type];
  const isQuiz = type === 'quiz';
  return {
    title: form.title.trim(),
    slug: text(form.slug),
    contentType: type,
    quizType: choice.quizType,
    description: text(form.description),
    programId: form.programId === 'global' ? null : Number(form.programId),
    // A new quiz has no questions yet, so it always starts as a draft.
    isPublished: isQuiz ? false : form.isPublished,
    topic: text(form.topic),
    ...(type !== 'external_test' ? { subject: form.subject, inLibrary: form.inLibrary } : {}),
    ...(def.hasDuration && form.durationMinutes.trim() !== '' ? { durationMinutes: Number(form.durationMinutes) } : {}),
    ...(type === 'lecture' ? { videoUrl: text(form.videoUrl) } : {}),
    ...(type === 'notes' || type === 'resource'
      ? { resourceLink: text(form.resourceLink), notesMarkdown: form.notes.trim() ? form.notes : undefined }
      : {}),
    ...(type === 'external_test'
      ? {
          externalProvider: form.externalProvider.trim(),
          externalUrl: form.externalUrl.trim(),
          assessmentCode: form.assessmentCode.trim()
        }
      : {})
  };
}

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programs: Program[];
}

/**
 * Two steps: pick what to make, then fill in only that type's fields, labelled as in the builder.
 * Everything entered here is saved on the new item, so the builder opens with it already filled in.
 */
export function CreateContentDialog({ open, onOpenChange, programs }: CreateContentDialogProps) {
  const router = useRouter();
  const [choiceId, setChoiceId] = React.useState<CreateChoiceId | null>(null);
  const [step, setStep] = React.useState<'type' | 'details'>('type');
  const [form, setForm] = React.useState<CreateForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const reset = () => {
    setChoiceId(null);
    setStep('type');
    setForm(EMPTY_FORM);
    setFieldErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmitting) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const set = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((errors) => (errors[key] ? { ...errors, [key]: undefined } : errors));
  };

  const choose = (id: CreateChoiceId) => {
    setChoiceId(id);
    setFieldErrors({});
    setStep('details');
  };

  const choice = CREATE_CHOICES.find((c) => c.id === choiceId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choice) return;
    const errors: Record<string, string> = {};
    if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters.';
    if (choice.contentType === 'dsa_sheet' && !form.slug.trim()) {
      errors.slug = 'Enter the slug of the DSA catalogue sheet this item links to.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createContentAction(toCreateInput(choice.id, form));
      if (!res.success) {
        const serverErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(res.fieldErrors ?? {})) {
          // The form calls notes "notes"; the action calls them notesMarkdown.
          if (messages?.[0]) serverErrors[key === 'notesMarkdown' ? 'notes' : key] = messages[0];
        }
        setFieldErrors(serverErrors);
        toast.error(res.error || 'Failed to create content item.');
        return;
      }

      const isQuiz = choice.contentType === 'quiz';
      toast.success(
        isQuiz
          ? 'Quiz created. Add its questions next.'
          : res.item.isPublished
            ? 'Created and published.'
            : 'Created as a draft. Review and publish it in the builder.'
      );
      onOpenChange(false);
      reset();
      router.push(isQuiz ? `/content/${res.item.id}/quiz` : `/content/${res.item.id}`);
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'type' || !choice ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Canonical Content Item</DialogTitle>
              <DialogDescription>
                Define once in the central library. Batches can reuse this content without duplication.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <span className="text-sm font-medium">What are you creating?</span>
              <ContentTypePicker value={choiceId} onChange={choose} />
            </div>
          </>
        ) : (
          <DetailsStep
            choiceId={choice.id}
            form={form}
            set={set}
            errorFor={(key) => fieldErrors[key]}
            programs={programs}
            isSubmitting={isSubmitting}
            onBack={() => setStep('type')}
            onCancel={() => handleOpenChange(false)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DetailsStepProps {
  choiceId: CreateChoiceId;
  form: CreateForm;
  set: <K extends keyof CreateForm>(key: K, value: CreateForm[K]) => void;
  errorFor: (key: string) => string | undefined;
  programs: Program[];
  isSubmitting: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function DetailsStep({
  choiceId,
  form,
  set,
  errorFor,
  programs,
  isSubmitting,
  onBack,
  onCancel,
  onSubmit
}: DetailsStepProps) {
  const choice = CREATE_CHOICES.find((c) => c.id === choiceId) ?? CREATE_CHOICES[0];
  const type = choice.contentType;
  const def = CONTENT_TYPE_DEFS[type];
  const isQuiz = type === 'quiz';
  const isDsa = type === 'dsa_sheet';
  const isExternal = type === 'external_test';

  const descriptionField = (
    <Field
      id="create-description"
      label={def.descriptionLabel}
      hint={def.descriptionHint}
      error={errorFor('description')}
      counter={`${form.description.length}/2000`}
    >
      <Textarea
        id="create-description"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={type === 'project' ? 6 : 3}
        maxLength={2000}
      />
    </Field>
  );

  const durationField = def.hasDuration && (
    <Field id="create-duration" label={def.durationLabel ?? 'Duration (minutes)'} error={errorFor('durationMinutes')}>
      <Input
        id="create-duration"
        type="number"
        inputMode="numeric"
        min={0}
        max={1440}
        value={form.durationMinutes}
        onChange={(e) => set('durationMinutes', e.target.value)}
        placeholder="e.g. 45"
      />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <DialogHeader>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change type
        </button>
        <DialogTitle>New {choice.label.toLowerCase()}</DialogTitle>
        <DialogDescription>{choice.description}</DialogDescription>
      </DialogHeader>

      <Field id="create-title" label="Title *" error={errorFor('title')}>
        <Input
          id="create-title"
          autoFocus
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={255}
          placeholder={TITLE_PLACEHOLDERS[choiceId]}
        />
      </Field>

      {/* The type's own fields */}
      <TypeFields choiceId={choiceId} form={form} set={set} errorFor={errorFor} durationField={durationField} />

      {type !== 'project' && descriptionField}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="create-topic" label="Topic" hint="A finer label, e.g. a pattern or chapter." error={errorFor('topic')}>
          <Input
            id="create-topic"
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
            placeholder="e.g. Arrays & Hashing"
            maxLength={100}
          />
        </Field>
        {!isExternal && (
          <Field id="create-subject" label="Subject" hint="The shelf in the student library." error={errorFor('subject')}>
            <Select value={form.subject || 'auto'} onValueChange={(v) => set('subject', v === 'auto' ? '' : v)}>
              <SelectTrigger id="create-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto ({contentSubjectLabel(resolveContentSubject({ topic: form.topic, title: form.title }))})
                </SelectItem>
                {CONTENT_SUBJECTS.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field id="create-scope" label="Available to" hint="Who may open it.">
          <Select value={form.programId} onValueChange={(v) => set('programId', v)}>
            <SelectTrigger id="create-scope">
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
        {!isDsa && (
          <Field
            id="create-slug"
            label="Slug (optional)"
            hint="Made from the title if blank."
            error={errorFor('slug')}
          >
            <Input
              id="create-slug"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
              className="font-mono text-sm"
              maxLength={120}
            />
          </Field>
        )}
      </div>

      <div className="space-y-2">
        {!isExternal && (
          <CheckboxRow
            id="create-inLibrary"
            checked={form.inLibrary}
            onChange={(checked) => set('inLibrary', checked)}
            label="Show in the student Library"
            hint={
              form.inLibrary
                ? 'Students find it in the Library as well as in any batch curriculum that schedules it.'
                : 'Off: students reach it only through a batch curriculum that schedules it.'
            }
          />
        )}
        {!isQuiz && (
          <CheckboxRow
            id="create-isPublished"
            checked={form.isPublished}
            onChange={(checked) => set('isPublished', checked)}
            label="Publish immediately"
            hint="Off: it is saved as a draft, hidden from students until you publish it."
          />
        )}
      </div>

      <DialogFooter className="gap-2 pt-2 sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating…' : isQuiz ? 'Create & add questions' : 'Create & open builder'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

const TITLE_PLACEHOLDERS: Record<CreateChoiceId, string> = {
  lecture: 'e.g. Sliding Window: Fixed and Variable Size',
  notes: 'e.g. Big-O Notation Cheat Sheet',
  resource: 'e.g. System Design Interview Slides',
  practice_quiz: 'e.g. Arrays & Hashing: Practice Check',
  formal_assessment: 'e.g. Week 4 Assessment: Trees',
  project: 'e.g. URL Shortener with Analytics',
  dsa_sheet: 'e.g. Blind 75',
  external_test: 'e.g. Aptitude Test 1 (QwikTest)'
};

function TypeFields({
  choiceId,
  form,
  set,
  errorFor,
  durationField
}: {
  choiceId: CreateChoiceId;
  form: CreateForm;
  set: DetailsStepProps['set'];
  errorFor: DetailsStepProps['errorFor'];
  durationField: React.ReactNode;
}) {
  const def = CONTENT_TYPE_DEFS[CREATE_CHOICES.find((c) => c.id === choiceId)!.contentType];

  const linkField = (
    <Field
      id="create-resourceLink"
      label="Document link"
      hint="Google Docs, Drive, Notion, GitHub, slides, a PDF… Students get an “Open Resource” button."
      error={errorFor('resourceLink')}
    >
      <Input
        id="create-resourceLink"
        value={form.resourceLink}
        onChange={(e) => set('resourceLink', e.target.value)}
        placeholder="https://"
        inputMode="url"
      />
    </Field>
  );
  const notesField = (rows: number) => (
    <Field
      id="create-notes"
      label="Notes"
      hint="Shown as plain text. Line breaks and indentation are kept as you type them."
      error={errorFor('notes')}
    >
      <Textarea
        id="create-notes"
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        rows={rows}
        className="font-mono text-sm leading-relaxed"
        placeholder={'Key ideas\n- …\n\nWorked example\n…'}
      />
    </Field>
  );

  switch (choiceId) {
    case 'lecture': {
      const parsed = form.videoUrl.trim() ? parseVideoUrl(form.videoUrl) : null;
      return (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field
            id="create-videoUrl"
            label="Video link"
            hint={
              parsed
                ? `${PROVIDER_NAMES[parsed.provider]}${parsed.provider === 'custom' ? '' : ` · video ${parsed.videoId}`}`
                : 'A YouTube or Vimeo link in any format, or an https embed URL.'
            }
            error={errorFor('videoUrl')}
          >
            <Input
              id="create-videoUrl"
              value={form.videoUrl}
              onChange={(e) => set('videoUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              inputMode="url"
            />
          </Field>
          {durationField}
        </div>
      );
    }
    case 'notes':
      return (
        <div className="space-y-4">
          {notesField(8)}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            {linkField}
            {durationField}
          </div>
        </div>
      );
    case 'resource':
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
            {linkField}
            {durationField}
          </div>
          {notesField(4)}
        </div>
      );
    case 'practice_quiz':
    case 'formal_assessment':
      return (
        <Note>
          {choiceId === 'formal_assessment'
            ? 'Starts with a 30-minute limit and explanations shown after the deadline. Questions, pass mark and timing are set in the quiz workbench, which opens next.'
            : 'Untimed, with explanations shown straight away. Questions and pass mark are set in the quiz workbench, which opens next.'}
        </Note>
      );
    case 'project':
      return (
        <div className="space-y-4">
          <Field
            id="create-description"
            label={def.descriptionLabel}
            hint={def.descriptionHint}
            error={errorFor('description')}
            counter={`${form.description.length}/2000`}
          >
            <Textarea
              id="create-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={6}
              maxLength={2000}
              placeholder={'Build …\n\nRequirements\n- …\n\nSubmit a GitHub repository link with a README.'}
            />
          </Field>
          <Note>Starts with the default grading rubric. Adjust its criteria in the builder, which opens next.</Note>
        </div>
      );
    case 'dsa_sheet':
      return (
        <div className="space-y-4">
          <Field
            id="create-slug"
            label="Catalogue sheet slug *"
            hint="Students are sent to the DSA Practice Center sheet with this slug, so it must match exactly."
            error={errorFor('slug')}
          >
            <Input
              id="create-slug"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase())}
              className="font-mono text-sm"
              placeholder="e.g. blind-75"
              maxLength={120}
            />
          </Field>
          <Note>Problems live in the student portal&apos;s DSA catalogue and are not authored here.</Note>
        </div>
      );
    case 'external_test':
      return (
        <div className="space-y-4">
          <Field
            id="create-externalUrl"
            label="Test link"
            hint="The candidate link from the platform, e.g. https://rms-careers.qwiktest.in/assessment-1. Must be https."
            error={errorFor('externalUrl')}
          >
            <Input
              id="create-externalUrl"
              value={form.externalUrl}
              onChange={(e) => set('externalUrl', e.target.value)}
              placeholder="https://"
              inputMode="url"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="create-externalProvider" label="Platform" hint="Shown to students." error={errorFor('externalProvider')}>
              <Input
                id="create-externalProvider"
                value={form.externalProvider}
                onChange={(e) => set('externalProvider', e.target.value)}
                placeholder="QwikTest"
                maxLength={60}
              />
            </Field>
            <Field
              id="create-assessmentCode"
              label="Assessment code"
              hint="Use it again when importing results."
              error={errorFor('assessmentCode')}
            >
              <Input
                id="create-assessmentCode"
                value={form.assessmentCode}
                onChange={(e) => set('assessmentCode', e.target.value)}
                placeholder="QT-CSE26-aptitude"
                className="font-mono text-sm"
              />
            </Field>
            {durationField}
          </div>
        </div>
      );
  }
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
  hint
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={`${id}-hint`}
      />
      <div className="space-y-1">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium leading-none">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
    </div>
  );
}
