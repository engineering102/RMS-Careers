import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, CheckCircle2, Award, Zap } from 'lucide-react';
import type { PracticeQuizSummary } from '@/lib/types/assessments';

interface AssessmentsHeaderProps {
  quizzes: PracticeQuizSummary[];
  formalAssessments?: import('@/lib/types/assessments').FormalAssessmentSummary[];
}

export function AssessmentsHeader({ quizzes, formalAssessments = [] }: AssessmentsHeaderProps) {
  const totalPractice = quizzes.length;
  const passedPractice = quizzes.filter((q) => q.isPassed).length;

  const totalFormal = formalAssessments.length;
  const completedFormal = formalAssessments.filter(
    (f) => f.status === 'submitted' || f.status === 'auto_submitted'
  ).length;

  const allTotal = totalPractice + totalFormal;
  const allCompleted = passedPractice + completedFormal;

  const attemptedPractice = quizzes.filter((q) => q.attemptCount > 0);
  const attemptedFormal = formalAssessments.filter((f) => f.attempt?.score !== undefined);

  const totalPercentages = [
    ...attemptedPractice.map((q) => q.bestPercentage ?? 0),
    ...attemptedFormal.map((f) => f.attempt?.percentage ?? 0)
  ];

  const averagePercentage =
    totalPercentages.length > 0
      ? Math.round(totalPercentages.reduce((a, b) => a + b, 0) / totalPercentages.length)
      : 0;

  // Each first pass awards 20 XP
  const estimatedXp = (passedPractice + formalAssessments.filter((f) => f.attempt?.isPassed).length) * 20;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Assessment Center
            </span>
            <span className="text-xs text-muted-foreground font-mono">Formal & Practice</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Assessment Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timed formal cohort examinations and self-paced practice knowledge checks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Assessments</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{allTotal}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-success mt-0.5">{allCompleted}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-success/10 border border-success/20 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Avg. Score</p>
              <p className="text-2xl font-bold text-primary mt-0.5">
                {totalPercentages.length > 0 ? `${averagePercentage}%` : '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Quiz XP Earned</p>
              <p className="text-2xl font-bold text-warning mt-0.5">+{estimatedXp}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-warning">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
