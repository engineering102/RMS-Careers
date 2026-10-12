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
import { formatDate } from '@/lib/format/datetime';

interface PracticeQuizCardProps {
  quiz: PracticeQuizSummary;
}

export function PracticeQuizCard({ quiz }: PracticeQuizCardProps) {
  const isPassed = quiz.isPassed;
  const isAttempted = quiz.attemptCount > 0;

  return (
    <Card className="border-border bg-card/60 backdrop-blur-sm hover:border-input transition-all flex flex-col justify-between">
      <CardContent className="p-5 space-y-4">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
            {quiz.programCode || quiz.programName}
          </span>

          {isPassed ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
              <CheckCircle2 className="h-3 w-3" />
              Passed ({quiz.bestPercentage}%)
            </span>
          ) : isAttempted ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
              <RotateCcw className="h-3 w-3" />
              Score: {quiz.bestPercentage}%
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-input">
              Not Started
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground line-clamp-1">
            {quiz.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
            {quiz.description || 'Comprehensive practice quiz covering key conceptual topics and problem solving.'}
          </p>
        </div>

        {/* Quiz Metadata */}
        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              {quiz.questionCount} {quiz.questionCount === 1 ? 'Question' : 'Questions'}
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-muted-foreground" />
              {quiz.totalPoints} {quiz.totalPoints === 1 ? 'Point' : 'Points'}
            </span>
          </div>

          <span className="text-muted-foreground text-[11px]">
            Pass: {quiz.passingScorePercent}%
          </span>
        </div>

        {/* Attempt history note if attempted */}
        {isAttempted && (
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>
              {quiz.attemptCount} {quiz.attemptCount === 1 ? 'attempt' : 'attempts'} recorded
            </span>
            {quiz.lastAttemptAt && (
              <span>
                Last: {formatDate(quiz.lastAttemptAt, {
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
                ? 'w-full bg-secondary hover:bg-accent text-foreground text-xs gap-1.5 border border-input'
                : isAttempted
                  ? 'w-full bg-warning hover:bg-warning/90 text-warning-foreground text-xs gap-1.5'
                  : 'w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5'
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
