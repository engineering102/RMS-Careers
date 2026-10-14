import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Timer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  HelpCircle,
  Award,
  Lock
} from 'lucide-react';
import type { FormalAssessmentSummary } from '@/lib/types/assessments';
import { formatDate } from '@/lib/format/datetime';

interface FormalAssessmentCardProps {
  assessment: FormalAssessmentSummary;
}

export function FormalAssessmentCard({ assessment }: FormalAssessmentCardProps) {
  const status = assessment.status;
  const isCompleted = status === 'submitted' || status === 'auto_submitted';
  const isInProgress = status === 'in_progress';
  const isAvailable = status === 'available';
  const isUpcoming = status === 'upcoming';
  const isClosed = status === 'closed';

  return (
    <Card className="border-border bg-card/60 hover:border-input transition-all flex flex-col justify-between">
      <CardContent className="p-5 space-y-4">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
              {assessment.programCode}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[140px]">
              {assessment.batchName}
            </span>
          </div>

          {isCompleted ? (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                assessment.attempt?.isPassed
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-secondary text-foreground/80 border border-input'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {assessment.attempt?.isPassed ? 'Passed' : 'Completed'} (
              {assessment.attempt?.percentage}%)
            </span>
          ) : isInProgress ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 animate-pulse">
              <Clock className="h-3 w-3" />
              In Progress
            </span>
          ) : isAvailable ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Timer className="h-3 w-3" />
              Available
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-input">
              <Lock className="h-3 w-3" />
              Upcoming
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-3 w-3" />
              Closed
            </span>
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground line-clamp-1">
            {assessment.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2rem]">
            {assessment.description ||
              'Formal cohort examination. Single attempt with countdown timer and server-verified evaluation.'}
          </p>
        </div>

        {/* Exam Specifications */}
        <div className="pt-2 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-warning">
              <Timer className="h-3.5 w-3.5" />
              {assessment.timeLimitMinutes} mins
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              {assessment.questionCount} Qs
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-muted-foreground" />
              {assessment.totalPoints} pts
            </span>
          </div>

          <span className="text-muted-foreground text-[11px]">
            Pass: {assessment.passingScorePercent}%
          </span>
        </div>

        {/* Schedule / Deadline */}
        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
          {assessment.dueAt ? (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              Due:{' '}
              {formatDate(assessment.dueAt, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          ) : (
            <span>Cohort Milestone</span>
          )}

          {isUpcoming && assessment.availableFrom && (
            <span className="text-muted-foreground">
              Opens:{' '}
              {formatDate(assessment.availableFrom, {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          {isUpcoming ? (
            <Button
              disabled
              className="w-full bg-secondary/60 text-muted-foreground border border-border text-xs gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Not Yet Open</span>
            </Button>
          ) : isClosed ? (
            <Button
              disabled
              className="w-full bg-secondary/60 text-muted-foreground border border-border text-xs gap-1.5"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Assessment Window Closed</span>
            </Button>
          ) : isCompleted ? (
            <Button
              asChild
              className="w-full bg-secondary hover:bg-accent text-foreground text-xs gap-1.5 border border-input"
            >
              <Link href={`/assessments/${assessment.id}?batchId=${assessment.batchId}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>View Results & Status</span>
              </Link>
            </Button>
          ) : isInProgress ? (
            <Button
              asChild
              className="w-full bg-warning hover:bg-warning/90 text-warning-foreground text-xs gap-1.5 font-semibold"
            >
              <Link href={`/assessments/${assessment.id}?batchId=${assessment.batchId}`}>
                <Timer className="h-3.5 w-3.5 animate-spin" />
                <span>Resume Timed Attempt</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 font-semibold"
            >
              <Link href={`/assessments/${assessment.id}?batchId=${assessment.batchId}`}>
                <Timer className="h-3.5 w-3.5" />
                <span>Begin Assessment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
