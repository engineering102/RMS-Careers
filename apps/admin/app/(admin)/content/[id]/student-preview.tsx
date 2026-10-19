'use client';

// A mirror of the student content page, built from the unsaved form (quizzes: from saved questions).
// It must stay inert: no server actions, no completion, submission or attempt calls (see content-preview test).
import * as React from 'react';
import { CheckCircle2, Clock, Code2, ExternalLink, FileText, PlayCircle, VideoOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Program, ContentTypeEnum } from '@rms/db';
import type { QuizWithDetails } from '@/lib/db/queries';
import { embedUrlFor, parseVideoUrl } from '@/lib/content/video-url';
import { contentTypeLabel } from '@/lib/content/types/registry';
import { isExternalTestUrl } from '@/lib/content/external-test';
import type { BuilderForm } from './builder-form';

interface PreviewProps {
  form: BuilderForm;
  quiz: QuizWithDetails | null;
}

const TYPE_PREVIEWS: Record<ContentTypeEnum, React.ComponentType<PreviewProps>> = {
  lecture: LecturePreview,
  notes: ReadingPreview,
  resource: ReadingPreview,
  project: ProjectPreview,
  quiz: QuizPreview,
  dsa_sheet: DsaSheetPreview,
  external_test: ExternalTestPreview
};

interface StudentPreviewProps {
  type: ContentTypeEnum;
  form: BuilderForm;
  programs: Program[];
  quiz: QuizWithDetails | null;
}

export function StudentPreview({ type, form, programs, quiz }: StudentPreviewProps) {
  const program = programs.find((p) => String(p.id) === form.programId);
  const duration = Number(form.durationMinutes);
  const Body = TYPE_PREVIEWS[type];

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        {/* Header, as on the student content page */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="rounded border border-border px-1.5 py-0.5">{contentTypeLabel(type)}</span>
            {program ? <span>{program.code ?? program.name}</span> : <Placeholder>RMS</Placeholder>}
            {form.topic.trim() && <span>· {form.topic.trim()}</span>}
            {form.durationMinutes.trim() !== '' && Number.isFinite(duration) && duration > 0 && (
              <span className="inline-flex items-center gap-1">
                · <Clock className="h-3 w-3" /> {duration} min
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold leading-snug text-foreground">
            {form.title.trim() || <Placeholder>Untitled</Placeholder>}
          </h3>
        </div>

        <Body form={form} quiz={quiz} />
      </CardContent>
    </Card>
  );
}

/** Marks text that is a stand-in, not the item's real value. */
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="italic text-muted-foreground">
      {children} <span className="text-[10px] not-italic">(placeholder)</span>
    </span>
  );
}

/** A student control shown for context only; clicking it does nothing in the preview. */
function InertButton({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled tabIndex={-1}>
        <Icon className="h-4 w-4" />
        {children}
      </Button>
      <span className="text-[11px] text-muted-foreground">Preview: not recorded</span>
    </div>
  );
}

function LecturePreview({ form }: PreviewProps) {
  const { videoUrl, description } = form;
  const parsed = parseVideoUrl(videoUrl);
  const canFrame = parsed && parsed.provider !== 'custom';

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
        {canFrame ? (
          <iframe
            key={embedUrlFor(parsed)}
            src={embedUrlFor(parsed)}
            title="Lecture video preview"
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            {parsed ? <PlayCircle className="h-8 w-8" /> : <VideoOff className="h-8 w-8" />}
            {parsed
              ? 'Custom player: students see it embedded from this URL.'
              : videoUrl.trim()
                ? 'This link cannot be embedded. Use a YouTube or Vimeo link, or an https embed URL.'
                : 'No video yet. Students see “video unavailable” until you add one.'}
          </div>
        )}
      </div>
      <InertButton icon={CheckCircle2}>Mark as complete</InertButton>
      {description.trim() && (
        <section className="rounded-lg border border-border p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">About this lecture</h4>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{description}</p>
        </section>
      )}
    </div>
  );
}

function ReadingPreview({ form }: PreviewProps) {
  const { resourceLink, notes, description } = form;
  const link = resourceLink.trim();
  const hasLink = /^https?:\/\/\S+$/i.test(link);
  const isPdf = hasLink && link.toLowerCase().endsWith('.pdf');
  return (
    <div className="space-y-3">
      {description.trim() && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {hasLink && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            Open Resource
          </a>
          <span className="text-xs text-muted-foreground">
            {isPdf ? 'PDF Document / Slide Deck' : 'External Learning Resource'}
          </span>
        </div>
      )}
      {notes.trim() ? (
        <div className="max-h-96 overflow-y-auto rounded-lg border border-border p-3">
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/80">{notes}</p>
        </div>
      ) : (
        !hasLink && (
          <PreviewNote icon={FileText}>No document or notes yet. Students see an empty reading page.</PreviewNote>
        )
      )}
      <InertButton icon={CheckCircle2}>Mark as complete</InertButton>
    </div>
  );
}

function ExternalTestPreview({ form }: PreviewProps) {
  const link = form.externalUrl.trim();
  const provider = form.externalProvider.trim() || 'the test platform';
  return (
    <div className="space-y-3">
      {form.description.trim() && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{form.description}</p>
      )}
      {isExternalTestUrl(link) ? (
        <div className="space-y-1">
          <InertButton icon={ExternalLink}>Start test on {provider}</InertButton>
          <p className="break-all font-mono text-[11px] text-muted-foreground">{link}</p>
        </div>
      ) : (
        <PreviewNote icon={ExternalLink}>No https test link yet. Students would have nothing to open.</PreviewNote>
      )}
      <p className="text-xs text-muted-foreground">
        Shown on the student Assessments page. The score appears there once results are imported
        {form.assessmentCode.trim() ? ` under ${form.assessmentCode.trim()}` : ' with a matching assessment code'}.
      </p>
    </div>
  );
}

function ProjectPreview({ form }: PreviewProps) {
  const criteria = form.rubric.filter((r) => r.title.trim());
  const total = criteria.reduce((sum, r) => sum + (Number(r.maxPoints) || 0), 0);
  return (
    <div className="space-y-3">
      {form.description.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{form.description}</p>
      ) : (
        <PreviewNote icon={FileText}>Add a project brief so students know what to build.</PreviewNote>
      )}
      <section className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evaluation rubric</h4>
          <span className="text-xs font-medium text-foreground">{total} pts</span>
        </div>
        <ul className="divide-y divide-border">
          {criteria.map((c) => (
            <li key={c.key} className="flex gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{c.title}</p>
                {c.description.trim() && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{Number(c.maxPoints) || 0} pts</span>
            </li>
          ))}
        </ul>
      </section>
      <fieldset disabled className="space-y-2 rounded-lg border border-dashed border-border p-3 opacity-70">
        <legend className="px-1 text-[11px] text-muted-foreground">Submission form (preview: disabled)</legend>
        <input className="w-full rounded border border-input bg-background px-2 py-1 text-xs" placeholder="GitHub repository URL *" />
        <input className="w-full rounded border border-input bg-background px-2 py-1 text-xs" placeholder="Live URL (optional)" />
        <textarea className="w-full rounded border border-input bg-background px-2 py-1 text-xs" rows={2} placeholder="Notes (optional)" />
      </fieldset>
    </div>
  );
}

function QuizPreview({ quiz }: PreviewProps) {
  const [showAnswers, setShowAnswers] = React.useState(false);
  if (!quiz) {
    return <PreviewNote icon={FileText}>The quiz has not been set up yet.</PreviewNote>;
  }
  const isFormal = quiz.quizType === 'formal';

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-border p-3 text-sm">
        <p className="font-medium text-foreground">{isFormal ? 'Formal assessment' : 'Practice quiz'}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {quiz.questionCount} question{quiz.questionCount === 1 ? '' : 's'} · {quiz.totalPoints} pts · pass at{' '}
          {quiz.passingScorePercent}% ·{' '}
          {isFormal
            ? `${quiz.timeLimitMinutes ?? 30} min, one attempt, auto-submits at the deadline`
            : 'untimed, unlimited retakes'}
        </p>
      </section>
      {quiz.questions.length === 0 ? (
        <PreviewNote icon={FileText}>No questions yet. Add them in the quiz workbench.</PreviewNote>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Showing saved questions; nothing is submitted.</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAnswers((v) => !v)}>
              {showAnswers ? 'Hide answers' : 'Show answers'}
            </Button>
          </div>
          <ol className="max-h-[28rem] space-y-3 overflow-y-auto">
            {quiz.questions.map((q, index) => (
              <li key={q.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  {index + 1}. {q.questionText}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({q.points} pt{q.points === 1 ? '' : 's'}
                    {q.questionType === 'multiple_choice' ? ', select all that apply' : ''})
                  </span>
                </p>
                <ul className="mt-2 space-y-1">
                  {q.options.map((o) => {
                    const correct = showAnswers && q.correctOptionIds.includes(o.id);
                    return (
                      <li
                        key={o.id}
                        className={
                          correct
                            ? 'rounded border border-success/40 bg-success/10 px-2 py-1 text-xs text-foreground'
                            : 'rounded border border-border px-2 py-1 text-xs text-foreground/80'
                        }
                      >
                        {o.text}
                      </li>
                    );
                  })}
                </ul>
                {showAnswers && q.explanationText && (
                  <p className="mt-2 text-xs text-muted-foreground">{q.explanationText}</p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

function DsaSheetPreview({ form }: PreviewProps) {
  return (
    <PreviewNote icon={Code2}>
      Opening this item takes students to the DSA Practice Center sheet
      <span className="font-mono"> {form.slug || '…'}</span>.
    </PreviewNote>
  );
}

function PreviewNote({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
