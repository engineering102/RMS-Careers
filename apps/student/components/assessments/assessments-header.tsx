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
            <span className="text-xs text-slate-500 font-mono">Formal & Practice</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Assessment Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Timed formal cohort examinations and self-paced practice knowledge checks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Assessments</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">{allTotal}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{allCompleted}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Avg. Score</p>
              <p className="text-2xl font-bold text-blue-400 mt-0.5">
                {totalPercentages.length > 0 ? `${averagePercentage}%` : '—'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Quiz XP Earned</p>
              <p className="text-2xl font-bold text-amber-400 mt-0.5">+{estimatedXp}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
