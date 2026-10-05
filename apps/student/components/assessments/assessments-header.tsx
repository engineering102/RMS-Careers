import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, CheckCircle2, Award, Zap } from 'lucide-react';
import type { PracticeQuizSummary } from '@/lib/types/assessments';

interface AssessmentsHeaderProps {
  quizzes: PracticeQuizSummary[];
}

export function AssessmentsHeader({ quizzes }: AssessmentsHeaderProps) {
  const totalQuizzes = quizzes.length;
  const passedQuizzes = quizzes.filter((q) => q.isPassed).length;

  const attemptedQuizzes = quizzes.filter((q) => q.attemptCount > 0);
  const averagePercentage =
    attemptedQuizzes.length > 0
      ? Math.round(
          attemptedQuizzes.reduce((sum, q) => sum + (q.bestPercentage ?? 0), 0) /
            attemptedQuizzes.length
        )
      : 0;

  // Each first pass awards 20 XP
  const estimatedXp = passedQuizzes * 20;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Practice Suite
            </span>
            <span className="text-xs text-slate-500 font-mono">Slice 11</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Assessment Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Self-paced practice knowledge checks with immediate feedback, detailed explanations, and unlimited retakes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Checks</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">{totalQuizzes}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Passed</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{passedQuizzes}</p>
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
                {attemptedQuizzes.length > 0 ? `${averagePercentage}%` : '—'}
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
