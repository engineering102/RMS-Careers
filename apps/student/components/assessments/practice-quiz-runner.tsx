'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Award,
  Zap,
  Lightbulb,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { submitPracticeQuizAttempt } from '@/lib/actions/quiz';
import type {
  PracticeQuizRunnerData,
  PracticeQuizSubmissionResult,
  ClientQuizQuestion
} from '@/lib/types/assessments';

interface PracticeQuizRunnerProps {
  quiz: PracticeQuizRunnerData;
  initialBatchId?: string;
}

export function PracticeQuizRunner({ quiz, initialBatchId }: PracticeQuizRunnerProps) {
  const [responses, setResponses] = useState<Record<number, string[]>>({});
  const [submissionResult, setSubmissionResult] = useState<PracticeQuizSubmissionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalQuestions = quiz.questions.length;
  const answeredQuestionsCount = Object.keys(responses).filter(
    (qId) => (responses[Number(qId)] ?? []).length > 0
  ).length;

  const handleSelectOption = (question: ClientQuizQuestion, optionId: string) => {
    if (submissionResult) return; // Locked during review mode

    setResponses((prev) => {
      const current = prev[question.id] ?? [];
      if (question.questionType === 'single_choice') {
        return {
          ...prev,
          [question.id]: [optionId]
        };
      } else {
        // multiple_choice
        const exists = current.includes(optionId);
        const updated = exists
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return {
          ...prev,
          [question.id]: updated
        };
      }
    });
  };

  const handleSubmit = () => {
    if (answeredQuestionsCount === 0) {
      setErrorMessage('Please answer at least one question before submitting.');
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await submitPracticeQuizAttempt({
        quizId: quiz.id,
        responses,
        batchId: initialBatchId || quiz.relatedBatchContext?.batchId
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit quiz attempt.');
      } else {
        setSubmissionResult(res.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const handleRetake = () => {
    setResponses({});
    setSubmissionResult(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Breadcrumb & Metadata Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2 text-xs gap-1.5"
          >
            <Link href="/assessments">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Assessments</span>
            </Link>
          </Button>

          {quiz.relatedBatchContext && (
            <>
              <span className="text-muted-foreground">/</span>
              <Link
                href={`/batches/${quiz.relatedBatchContext.batchId}`}
                className="text-xs text-primary hover:text-primary transition-colors"
              >
                {quiz.relatedBatchContext.batchName}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
            {quiz.programCode || quiz.programName}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Practice (Untimed)
          </span>
        </div>
      </div>

      {/* Quiz Header Hero */}
      <div className="border border-border bg-card/60 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {quiz.title}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {quiz.description ||
              'Test your knowledge with immediate answer validation and detailed explanations. Unlimited retakes are allowed.'}
          </p>
        </div>

        <div className="pt-4 border-t border-border flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-purple-400" />
            <span>
              {totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-warning" />
            <span>
              {quiz.totalPoints} Total {quiz.totalPoints === 1 ? 'Point' : 'Points'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>Passing Threshold: {quiz.passingScorePercent}%</span>
          </div>

          {quiz.previousAttemptsCount > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>
                {quiz.previousAttemptsCount}{' '}
                {quiz.previousAttemptsCount === 1 ? 'prior attempt' : 'prior attempts'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Submission Result Hero (Rendered upon submission) */}
      {submissionResult && (
        <Card
          className={`border animate-in fade-in-0 zoom-in-[0.96] duration-250 ease-out-quint motion-reduce:zoom-in-100 ${
            submissionResult.isPassed
              ? 'border-success/40 bg-success/5'
              : 'border-warning/40 bg-warning/5'
          }`}
        >
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    submissionResult.isPassed
                      ? 'bg-success/20 border-success/30 text-success'
                      : 'bg-warning/20 border-warning/30 text-warning'
                  }`}
                >
                  {submissionResult.isPassed ? (
                    <CheckCircle2 className="h-7 w-7 animate-pop [animation-delay:100ms] motion-reduce:animate-none" />
                  ) : (
                    <XCircle className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {submissionResult.isPassed
                      ? 'Practice Knowledge Check Passed!'
                      : 'Needs Improvement — Practice Makes Perfect'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {submissionResult.isPassed
                      ? 'You successfully met the passing standard for this knowledge check.'
                      : `You achieved ${submissionResult.percentage}%. The passing threshold is ${quiz.passingScorePercent}%.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-foreground">
                    {submissionResult.percentage}%
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {submissionResult.score} / {submissionResult.maxScore} points
                  </div>
                </div>

                {submissionResult.isFirstPass ? (
                  <div className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning flex items-center gap-1.5 text-xs font-semibold">
                    <Zap className="h-4 w-4" />
                    <span>+{submissionResult.xpAwarded} XP Earned</span>
                  </div>
                ) : submissionResult.isPassed ? (
                  <div className="px-2.5 py-1 rounded bg-secondary border border-input text-muted-foreground text-[11px]">
                    XP already claimed
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick Actions after grading */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Review question explanations below, then retake whenever you are ready.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRetake}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake Practice Quiz</span>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-input bg-card/60 hover:bg-secondary text-foreground/80 text-xs"
                >
                  <Link href="/assessments">Assessments Catalog</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answering Progress Bar (shown when active) */}
      {!submissionResult && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Progress: {answeredQuestionsCount} of {totalQuestions} answered
            </span>
            <span>
              {totalQuestions > 0
                ? Math.round((answeredQuestionsCount / totalQuestions) * 100)
                : 0}
              % completed
            </span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${totalQuestions > 0 ? (answeredQuestionsCount / totalQuestions) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((question, qIdx) => {
          const selectedOptionIds = responses[question.id] ?? [];
          const grading = submissionResult?.questionResults.find(
            (r) => r.questionId === question.id
          );

          return (
            <Card
              key={question.id}
              className={`border transition-all ${
                grading
                  ? grading.isCorrect
                    ? 'border-success/30 bg-card/80'
                    : 'border-destructive/30 bg-card/80'
                  : 'border-border bg-card/60'
              }`}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-secondary border border-input text-xs font-bold text-foreground/80 font-mono">
                      {qIdx + 1}
                    </span>

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-input/80">
                      {question.questionType === 'single_choice'
                        ? 'Single Choice'
                        : 'Multiple Choice'}
                    </span>

                    <span className="text-[11px] text-muted-foreground font-medium">
                      {question.points} {question.points === 1 ? 'Point' : 'Points'}
                    </span>
                  </div>

                  {grading && (
                    <div className="flex items-center gap-1.5">
                      {grading.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct (+{grading.earnedPoints} pts)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                          <XCircle className="h-3.5 w-3.5" />
                          Incorrect (0 / {grading.points} pts)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                  {question.questionText}
                </p>

                {/* Options List */}
                <div className="space-y-2.5 pt-1">
                  {question.options.map((option) => {
                    const isSelected = selectedOptionIds.includes(option.id);

                    // Review mode evaluations
                    let optionClasses =
                      'border-border bg-background/40 text-foreground/80 hover:border-input hover:bg-secondary/40';

                    if (submissionResult && grading && submissionResult.answerKeyHidden) {
                      // Answer key withheld by the quiz policy: show only the student's own selection.
                      optionClasses = isSelected
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border/60 bg-background/20 text-muted-foreground';
                    } else if (submissionResult && grading) {
                      const isOptionCorrect = grading.correctOptionIds.includes(option.id);
                      if (isOptionCorrect) {
                        // Authoritative correct option
                        optionClasses =
                          'border-success/50 bg-success/5 text-foreground font-medium';
                      } else if (isSelected && !isOptionCorrect) {
                        // Student selected an incorrect option
                        optionClasses =
                          'border-destructive/50 bg-destructive/5 text-foreground line-through';
                      } else {
                        // Unselected incorrect option
                        optionClasses = 'border-border/60 bg-background/20 text-muted-foreground';
                      }
                    } else if (isSelected) {
                      // Active answering mode selected option
                      optionClasses =
                        'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30';
                    }

                    return (
                      <button
                        type="button"
                        key={option.id}
                        disabled={Boolean(submissionResult)}
                        onClick={() => handleSelectOption(question, option.id)}
                        className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-3 transition-all active:scale-[0.99] motion-reduce:active:scale-100 ${optionClasses} ${
                          submissionResult ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-all ${
                            question.questionType === 'single_choice'
                              ? 'rounded-full'
                              : 'rounded'
                          } ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-input bg-card'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        <span className="flex-1 leading-snug">{option.text}</span>

                        {submissionResult && grading && (
                          <div className="shrink-0 text-xs">
                            {grading.correctOptionIds.includes(option.id) && (
                              <span className="text-[11px] font-semibold text-success">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Explanation Breakdown (Rendered upon submission) */}
                {grading && grading.explanationText && (
                  <div className="mt-4 p-3.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Explanation</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">
                      {grading.explanationText}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submission Footer Bar (Active mode) */}
      {!submissionResult && (
        <div className="sticky bottom-4 z-20 p-4 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-xl flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{answeredQuestionsCount}</span> of{' '}
            <span className="font-semibold text-foreground">{totalQuestions}</span> answered
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isPending || answeredQuestionsCount === 0}
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-2 px-5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Grading Practice Quiz...</span>
                </>
              ) : (
                <>
                  <span>Submit Practice Quiz</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
