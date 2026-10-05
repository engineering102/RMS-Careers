import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowRight,
  HelpCircle,
  Award
} from 'lucide-react';
import type { PracticeQuizSummary } from '@/lib/types/assessments';

interface PracticeQuizCardProps {
  quiz: PracticeQuizSummary;
}

export function PracticeQuizCard({ quiz }: PracticeQuizCardProps) {
  const isPassed = quiz.isPassed;
  const isAttempted = quiz.attemptCount > 0;

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:border-slate-700 transition-all flex flex-col justify-between">
      <CardContent className="p-5 space-y-4">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
            {quiz.programCode || quiz.programName}
          </span>

          {isPassed ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Passed ({quiz.bestPercentage}%)
            </span>
          ) : isAttempted ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <RotateCcw className="h-3 w-3" />
              Score: {quiz.bestPercentage}%
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Not Started
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-slate-100 line-clamp-1">
            {quiz.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
            {quiz.description || 'Comprehensive practice quiz covering key conceptual topics and problem solving.'}
          </p>
        </div>

        {/* Quiz Metadata */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
              {quiz.questionCount} {quiz.questionCount === 1 ? 'Question' : 'Questions'}
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-slate-500" />
              {quiz.totalPoints} {quiz.totalPoints === 1 ? 'Point' : 'Points'}
            </span>
          </div>

          <span className="text-slate-500 text-[11px]">
            Pass: {quiz.passingScorePercent}%
          </span>
        </div>

        {/* Attempt history note if attempted */}
        {isAttempted && (
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              {quiz.attemptCount} {quiz.attemptCount === 1 ? 'attempt' : 'attempts'} recorded
            </span>
            {quiz.lastAttemptAt && (
              <span>
                Last: {new Date(quiz.lastAttemptAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-1">
          <Button
            asChild
            className={
              isPassed
                ? 'w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs gap-1.5 border border-slate-700'
                : isAttempted
                  ? 'w-full bg-amber-600 hover:bg-amber-500 text-white text-xs gap-1.5'
                  : 'w-full bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5'
            }
          >
            <Link href={`/assessments/${quiz.id}`}>
              {isPassed ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake Practice</span>
                </>
              ) : isAttempted ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Try Again</span>
                </>
              ) : (
                <>
                  <span>Start Practice</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
