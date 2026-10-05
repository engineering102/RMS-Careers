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
            className="text-slate-400 hover:text-slate-200 -ml-2 text-xs gap-1.5"
          >
            <Link href="/assessments">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Assessments</span>
            </Link>
          </Button>

          {quiz.relatedBatchContext && (
            <>
              <span className="text-slate-600">/</span>
              <Link
                href={`/batches/${quiz.relatedBatchContext.batchId}`}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {quiz.relatedBatchContext.batchName}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {quiz.programCode || quiz.programName}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Practice (Untimed)
          </span>
        </div>
      </div>

      {/* Quiz Header Hero */}
      <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-sm rounded-xl p-6 sm:p-8 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            {quiz.title}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
            {quiz.description ||
              'Test your knowledge with immediate answer validation and detailed explanations. Unlimited retakes are allowed.'}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-purple-400" />
            <span>
              {totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-400" />
            <span>
              {quiz.totalPoints} Total {quiz.totalPoints === 1 ? 'Point' : 'Points'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Passing Threshold: {quiz.passingScorePercent}%</span>
          </div>

          {quiz.previousAttemptsCount > 0 && (
            <div className="flex items-center gap-1.5 text-slate-500">
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
          className={`border ${
            submissionResult.isPassed
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : 'border-amber-500/40 bg-amber-950/20'
          } backdrop-blur-sm`}
        >
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl border ${
                    submissionResult.isPassed
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {submissionResult.isPassed ? (
                    <CheckCircle2 className="h-7 w-7" />
                  ) : (
                    <XCircle className="h-7 w-7" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-100">
                    {submissionResult.isPassed
                      ? 'Practice Knowledge Check Passed!'
                      : 'Needs Improvement — Practice Makes Perfect'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {submissionResult.isPassed
                      ? 'You successfully met the passing standard for this knowledge check.'
                      : `You achieved ${submissionResult.percentage}%. The passing threshold is ${quiz.passingScorePercent}%.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-100">
                    {submissionResult.percentage}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {submissionResult.score} / {submissionResult.maxScore} points
                  </div>
                </div>

                {submissionResult.isFirstPass ? (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 text-xs font-semibold">
                    <Zap className="h-4 w-4" />
                    <span>+{submissionResult.xpAwarded} XP Earned</span>
                  </div>
                ) : submissionResult.isPassed ? (
                  <div className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[11px]">
                    XP already claimed
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick Actions after grading */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Review question explanations below, then retake whenever you are ready.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRetake}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake Practice Quiz</span>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs"
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
          <div className="flex items-center justify-between text-xs text-slate-400">
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
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{
                width: `${totalQuestions > 0 ? (answeredQuestionsCount / totalQuestions) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
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
                    ? 'border-emerald-500/30 bg-slate-900/80'
                    : 'border-rose-500/30 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 font-mono">
                      {qIdx + 1}
                    </span>

                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/80">
                      {question.questionType === 'single_choice'
                        ? 'Single Choice'
                        : 'Multiple Choice'}
                    </span>

                    <span className="text-[11px] text-slate-500 font-medium">
                      {question.points} {question.points === 1 ? 'Point' : 'Points'}
                    </span>
                  </div>

                  {grading && (
                    <div className="flex items-center gap-1.5">
                      {grading.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct (+{grading.earnedPoints} pts)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="h-3.5 w-3.5" />
                          Incorrect (0 / {grading.points} pts)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Text */}
                <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
                  {question.questionText}
                </p>

                {/* Options List */}
                <div className="space-y-2.5 pt-1">
                  {question.options.map((option) => {
                    const isSelected = selectedOptionIds.includes(option.id);

                    // Review mode evaluations
                    let optionClasses =
                      'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40';

                    if (submissionResult && grading) {
                      const isOptionCorrect = grading.correctOptionIds.includes(option.id);
                      if (isOptionCorrect) {
                        // Authoritative correct option
                        optionClasses =
                          'border-emerald-500/50 bg-emerald-950/30 text-emerald-200 font-medium';
                      } else if (isSelected && !isOptionCorrect) {
                        // Student selected an incorrect option
                        optionClasses =
                          'border-rose-500/50 bg-rose-950/30 text-rose-200 line-through';
                      } else {
                        // Unselected incorrect option
                        optionClasses = 'border-slate-800/60 bg-slate-950/20 text-slate-500';
                      }
                    } else if (isSelected) {
                      // Active answering mode selected option
                      optionClasses =
                        'border-purple-500/60 bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/30';
                    }

                    return (
                      <button
                        type="button"
                        key={option.id}
                        disabled={Boolean(submissionResult)}
                        onClick={() => handleSelectOption(question, option.id)}
                        className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-3 transition-all ${optionClasses} ${
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
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        <span className="flex-1 leading-snug">{option.text}</span>

                        {submissionResult && grading && (
                          <div className="shrink-0 text-xs">
                            {grading.correctOptionIds.includes(option.id) && (
                              <span className="text-[11px] font-semibold text-emerald-400">
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
                  <div className="mt-4 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Explanation</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
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
        <div className="sticky bottom-4 z-20 p-4 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{answeredQuestionsCount}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalQuestions}</span> answered
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              disabled={isPending || answeredQuestionsCount === 0}
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-2 px-5"
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
