'use client';

import * as React from 'react';
import { Bookmark, Code2, ExternalLink, FileQuestion, FileText, FolderGit2, PlayCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTENT_TYPE_DEFS, CREATE_CHOICES, WORKFLOW_LABELS, type CreateChoiceId } from '@/lib/content/types/registry';

const CHOICE_STYLE: Record<CreateChoiceId, { icon: React.ElementType; accent: string }> = {
  lecture: { icon: PlayCircle, accent: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  notes: { icon: FileText, accent: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  resource: { icon: Bookmark, accent: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  practice_quiz: { icon: FileQuestion, accent: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  formal_assessment: { icon: ShieldCheck, accent: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  project: { icon: FolderGit2, accent: 'text-green-500 bg-green-500/10 border-green-500/20' },
  dsa_sheet: { icon: Code2, accent: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  external_test: { icon: ExternalLink, accent: 'text-rose-500 bg-rose-500/10 border-rose-500/20' }
};

/** The content-type step of the create dialog: one card per thing an admin can actually make. */
export function ContentTypePicker({
  value,
  onChange
}: {
  value: CreateChoiceId;
  onChange: (value: CreateChoiceId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Content type" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {CREATE_CHOICES.map((choice) => {
        const { icon: Icon, accent } = CHOICE_STYLE[choice.id];
        const selected = value === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(choice.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50'
            )}
          >
            <span className={cn('shrink-0 rounded-md border p-2', accent)}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium text-foreground">{choice.label}</span>
              <span className="block text-xs text-muted-foreground">{choice.description}</span>
              <span className="block text-[11px] text-muted-foreground/80">
                {WORKFLOW_LABELS[CONTENT_TYPE_DEFS[choice.contentType].workflow]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
