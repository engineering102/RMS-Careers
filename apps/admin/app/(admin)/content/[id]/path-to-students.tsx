import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface PathStep {
  id: string;
  label: string;
  done: boolean;
  /** What is missing, or what the finished step means. */
  detail?: string;
  /** Things to fix before the step counts as done. */
  problems?: string[];
}

/**
 * The steps between "created" and "students can open it", from what the builder knows about the item.
 * Pure, so the rules are unit-tested without rendering.
 */
export function buildPathSteps(input: {
  warnings: string[];
  isDirty: boolean;
  status: 'draft' | 'published' | 'archived';
  placementCount: number;
  /** Saved Library switch; false for types that are never listed in the Library. */
  inLibrary: boolean;
}): PathStep[] {
  const reach =
    input.placementCount > 0 && input.inLibrary
      ? `In ${input.placementCount} batch ${input.placementCount === 1 ? 'curriculum' : 'curriculums'} and the Library.`
      : input.placementCount > 0
        ? `In ${input.placementCount} batch ${input.placementCount === 1 ? 'curriculum' : 'curriculums'}.`
        : input.inLibrary
          ? 'Shown in the student Library.'
          : 'Not in a batch curriculum or the Library yet, so no student can find it.';

  return [
    {
      id: 'content',
      label: 'Content is complete',
      done: input.warnings.length === 0,
      problems: input.warnings
    },
    {
      id: 'saved',
      label: 'Changes are saved',
      done: !input.isDirty,
      detail: input.isDirty ? 'You have unsaved changes.' : undefined
    },
    {
      id: 'published',
      label: 'Published',
      done: input.status === 'published',
      detail:
        input.status === 'published'
          ? undefined
          : input.status === 'archived'
            ? 'Archived: restore it from the Content Library first.'
            : 'Drafts are hidden from students and cannot be placed in a batch.'
    },
    {
      id: 'reach',
      label: 'Students can find it',
      done: input.status === 'published' && (input.placementCount > 0 || input.inLibrary),
      detail: reach
    }
  ];
}

/** A compact checklist that shows how far the item is from reaching students, and what is in the way. */
export function PathToStudents({ steps }: { steps: PathStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          Path to students
          <span className="text-xs font-normal text-muted-foreground">
            {doneCount} of {steps.length} done
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="space-y-2.5">
          {steps.map((step) => {
            const hasProblems = !step.done && (step.problems?.length ?? 0) > 0;
            const Icon = step.done ? CheckCircle2 : hasProblems ? AlertTriangle : Circle;
            return (
              <li key={step.id} className="flex gap-2.5 text-sm">
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    step.done ? 'text-success' : hasProblems ? 'text-warning' : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className={cn('font-medium', step.done ? 'text-foreground' : 'text-foreground')}>
                    {step.label}
                    <span className="sr-only">{step.done ? ' (done)' : ' (not done)'}</span>
                  </p>
                  {hasProblems ? (
                    <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                      {step.problems!.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : step.detail ? (
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
