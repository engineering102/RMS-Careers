'use client';

import * as React from 'react';
import Link from 'next/link';
import { FileQuestion, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EditorProps } from './editor-props';

const EXPLANATION_LABELS = {
  immediate: 'Right after submitting',
  after_deadline: 'After the deadline',
  never: 'Never'
} as const;

/**
 * Read-only summary of the quiz. Questions, timing, pass mark and explanations stay in the quiz workbench,
 * which owns their validation and the attempt locks.
 */
export function QuizEditor({ item, quiz }: EditorProps) {
  const isFormal = quiz?.quizType === 'formal';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Questions &amp; rules</CardTitle>
          {quiz && (
            <Badge variant={isFormal ? 'default' : 'secondary'}>{isFormal ? 'Formal assessment' : 'Practice quiz'}</Badge>
          )}
        </div>
        <CardDescription>
          {isFormal
            ? 'One timed attempt. The server sets the deadline when the student starts and submits automatically when time runs out.'
            : 'Untimed, with unlimited retakes. Each attempt is graded on the server.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {quiz ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="Questions" value={String(quiz.questionCount)} />
            <Stat label="Total points" value={String(quiz.totalPoints)} />
            <Stat label="Pass mark" value={`${quiz.passingScorePercent}%`} />
            {/* Practice quizzes are untimed for students whatever is stored. */}
            <Stat label="Time limit" value={isFormal ? `${quiz.timeLimitMinutes ?? 30} min` : 'None (practice)'} />
            <Stat label="Explanations" value={EXPLANATION_LABELS[quiz.showExplanations]} />
            <Stat label="Student attempts" value={String(quiz.attemptCount)} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">The quiz has not been set up yet. Open the workbench to start.</p>
        )}
        {quiz && quiz.attemptCount > 0 && (
          <p className="flex gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Students have attempted this quiz, so questions can no longer be deleted.
          </p>
        )}
        <Button asChild variant="outline">
          <Link href={`/content/${item.id}/quiz`}>
            <FileQuestion className="h-4 w-4" />
            Open quiz workbench
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
