'use client';

import * as React from 'react';
import { Clock, ExternalLink, FileQuestion, FileText, Code2, PlayCircle, VideoOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Program, ContentTypeEnum } from '@rms/db';
import { embedUrlFor, parseVideoUrl } from '@/lib/content/video-url';
import type { BuilderForm } from './content-builder-client';

const TYPE_LABELS: Record<ContentTypeEnum, string> = {
  lecture: 'Lecture',
  notes: 'Reading',
  dsa_sheet: 'DSA Sheet',
  quiz: 'Quiz',
  project: 'Project',
  resource: 'Resource'
};

interface StudentPreviewProps {
  type: ContentTypeEnum;
  form: BuilderForm;
  programs: Program[];
}

/** An approximation of the student content page, built from the unsaved form values. */
export function StudentPreview({ type, form, programs }: StudentPreviewProps) {
  const program = programs.find((p) => String(p.id) === form.programId);
  const programCode = program?.code ?? 'RMS';
  const duration = Number(form.durationMinutes);

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-4">
        {/* Header, as on the student content page */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="rounded border border-border px-1.5 py-0.5">{TYPE_LABELS[type]}</span>
            <span>{programCode}</span>
            {form.topic.trim() && <span>· {form.topic.trim()}</span>}
            {form.durationMinutes.trim() !== '' && Number.isFinite(duration) && duration > 0 && (
              <span className="inline-flex items-center gap-1">
                · <Clock className="h-3 w-3" /> {duration} min
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold leading-snug text-foreground">{form.title.trim() || 'Untitled'}</h3>
        </div>

        {type === 'lecture' && <LecturePreview videoUrl={form.videoUrl} description={form.description} />}
        {(type === 'notes' || type === 'resource') && (
          <ReadingPreview resourceLink={form.resourceLink} notes={form.notes} description={form.description} />
        )}
        {type === 'project' && <ProjectPreview form={form} />}
        {type === 'quiz' && (
          <PreviewNote icon={FileQuestion}>
            Students see the quiz start screen with its time limit and pass mark from the quiz workbench.
          </PreviewNote>
        )}
        {type === 'dsa_sheet' && (
          <PreviewNote icon={Code2}>
            Opening this item takes students to the DSA Practice Center topic
            <span className="font-mono"> {form.slug || '…'}</span>.
          </PreviewNote>
        )}
      </CardContent>
    </Card>
  );
}

function LecturePreview({ videoUrl, description }: { videoUrl: string; description: string }) {
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
      {description.trim() && (
        <section className="rounded-lg border border-border p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">About this lecture</h4>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{description}</p>
        </section>
      )}
    </div>
  );
}

function ReadingPreview({ resourceLink, notes, description }: { resourceLink: string; notes: string; description: string }) {
  const hasLink = /^https?:\/\/\S+$/i.test(resourceLink.trim());
  return (
    <div className="space-y-3">
      {description.trim() && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {hasLink && (
        <a
          href={resourceLink.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ExternalLink className="h-4 w-4" />
          Open Resource
        </a>
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
    </div>
  );
}

function ProjectPreview({ form }: { form: BuilderForm }) {
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
      <p className="text-xs text-muted-foreground">Students submit a GitHub link, an optional live URL and notes.</p>
    </div>
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
