'use client';

import * as React from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { rubricMaxScore } from '@/lib/content/project-rubric';
import { rubricKey, type RubricRow } from '../builder-form';
import type { EditorProps } from './editor-props';

export function ProjectEditor({ form, set, errorFor, projectConfig }: EditorProps) {
  const usesDefaultRubric = !projectConfig || projectConfig.rubricCriteria.length === 0;

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

  return (
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
            This project has no rubric of its own yet, so students see the default below. Edit it and save to make it
            this project&apos;s rubric.
          </p>
        )}
        {projectConfig && projectConfig.submissionCount > 0 && (
          <p className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            {projectConfig.submissionCount} submission{projectConfig.submissionCount === 1 ? ' has' : 's have'} already
            been made. Changing the rubric does not change scores already given.
          </p>
        )}
        {errorFor('rubric') && <p className="text-sm text-destructive">{errorFor('rubric')}</p>}
        <ol className="space-y-3">
          {form.rubric.map((row, index) => (
            <li key={row.key} className="rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 w-5 shrink-0 text-xs font-semibold text-muted-foreground">{index + 1}.</span>
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
          onClick={() => set('rubric', [...form.rubric, { key: rubricKey(), title: '', maxPoints: '10', description: '' }])}
          disabled={form.rubric.length >= 12}
        >
          <Plus className="h-4 w-4" />
          Add criterion
        </Button>
      </CardContent>
    </Card>
  );
}
