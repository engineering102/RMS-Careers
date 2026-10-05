'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Award,
  Zap,
  Lightbulb,
  Check,
  AlertCircle,
  Loader2,
  Lock,
  EyeOff,
  Calendar,
  Clock
} from 'lucide-react';
import { startFormalAssessmentAttempt, submitFormalAssessment } from '@/lib/actions/quiz';
import type {
  FormalAssessmentRunnerData,
  FormalAssessmentSubmissionResult,
  ClientQuizQuestion
} from '@/lib/types/assessments';

interface FormalAssessmentRunnerProps {
  initialData: FormalAssessmentRunnerData;
}

export function FormalAssessmentRunner({ initialData }: FormalAssessmentRunnerProps) {
  // Assessment attempt state machine
  const [activeAttempt, setActiveAttempt] = useState(initialData.activeAttempt);
  const [completedAttempt, setCompletedAttempt] = useState(initialData.completedAttempt);
  const [responses, setResponses] = useState<Record<number, string[]>>(
    initialData.activeAttempt?.responses ?? {}
  );
  const [tabBlurCount, setTabBlurCount] = useState<number>(
    initialData.activeAttempt?.tabBlurCount ?? 0
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    initialData.activeAttempt?.remainingSeconds ?? 0
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const [isStarting, startTransitionStart] = useTransition();
  const [isSubmitting, startTransitionSubmit] = useTransition();

  const isExamActive = Boolean(activeAttempt && !completedAttempt);

  // 1. Authoritative Countdown Timer logic
  useEffect(() => {
    if (!isExamActive || !activeAttempt) return;

    const deadlineMs = new Date(activeAttempt.authoritativeDeadline).getTime();

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        setConfirmSubmitOpen(false);
        // Authoritative time has reached zero: trigger automatic submission
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamActive, activeAttempt]);

  // 2. Tab-Blur Telemetry (Section 9.2: local counter submitted with attempt payload)
  useEffect(() => {
    if (!isExamActive) return;

    const handleWindowBlur = () => {
      setTabBlurCount((prev) => prev + 1);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [isExamActive]);

  // Format seconds as MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelectOption = (question: ClientQuizQuestion, optionId: string) => {
    if (!isExamActive || remainingSeconds <= 0 || isSubmitting) return;

    setResponses((prev) => {
      const current = prev[question.id] ?? [];
      if (question.questionType === 'single_choice') {
        return {
          ...prev,
          [question.id]: [optionId]
        };
      } else {
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

  const handleBeginAssessment = () => {
    setErrorMessage(null);
    startTransitionStart(async () => {
      const res = await startFormalAssessmentAttempt({
        quizId: initialData.id,
        batchId: initialData.batchId
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to start assessment attempt.');
      } else {
        const nowMs = Date.now();
        const deadlineMs = new Date(res.data.authoritativeDeadline).getTime();
        const sec = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));

        setActiveAttempt({
          id: res.data.attemptId,
          startedAt: res.data.startedAt,
          authoritativeDeadline: res.data.authoritativeDeadline,
          remainingSeconds: sec,
          responses: {},
          tabBlurCount: 0
        });
        setRemainingSeconds(sec);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const executeSubmission = useCallback(
    (isAuto: boolean) => {
      if (!activeAttempt || isSubmitting) return;

      setErrorMessage(null);
      startTransitionSubmit(async () => {
        const res = await submitFormalAssessment({
          attemptId: activeAttempt.id,
          quizId: initialData.id,
          batchId: initialData.batchId,
          responses,
          tabBlurCount,
          isAutoSubmit: isAuto
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit formal assessment.');
        } else {
          setActiveAttempt(null);
          setCompletedAttempt({
            id: res.data.attemptId,
            startedAt: activeAttempt.startedAt,
            submittedAt: res.data.submittedAt,
            score: res.data.score,
            maxScore: res.data.maxScore,
            percentage: res.data.percentage,
            isPassed: res.data.isPassed,
            tabBlurCount: res.data.tabBlurCount,
            isAutoSubmitted: res.data.isAutoSubmitted,
            explanationsSuppressed: res.data.explanationsSuppressed,
            publishDate: res.data.publishDate,
            questionResults: res.data.questionResults
          });
          setConfirmSubmitOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    },
    [activeAttempt, initialData.id, initialData.batchId, responses, tabBlurCount]
  );

  const handleAutoSubmit = () => {
    executeSubmission(true);
  };

  const handleManualSubmit = () => {
    executeSubmission(false);
  };

  const totalQuestions = initialData.questions.length;
  const answeredCount = Object.keys(responses).filter(
    (qId) => (responses[Number(qId)] ?? []).length > 0
  ).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Breadcrumb Navigation */}
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
              <span>Assessments Center</span>
            </Link>
          </Button>

          <span className="text-slate-600">/</span>
          <Link
            href={`/batches/${initialData.batchId}`}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {initialData.batchName}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {initialData.programCode}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Timer className="h-3 w-3" />
            Formal Exam ({initialData.timeLimitMinutes}m)
          </span>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. PRE-ATTEMPT BRIEFING VIEW                         */}
      {/* ---------------------------------------------------- */}
      {!isExamActive && !completedAttempt && (
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                <Timer className="h-4 w-4" />
                <span>Timed Formal Examination</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                {initialData.title}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                {initialData.description ||
                  'Formal examination aligned with your cohort curriculum. Please ensure you have a stable network connection before starting.'}
              </p>
            </div>

            {/* Exam Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-800">
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Duration</span>
                <p className="text-sm font-bold text-amber-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {initialData.timeLimitMinutes} Minutes
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Total Questions</span>
                <p className="text-sm font-bold text-slate-200 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                  {totalQuestions} Questions
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Total Points</span>
                <p className="text-sm font-bold text-slate-200 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-slate-400" />
                  {initialData.totalPoints} Points
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium">Pass Threshold</span>
                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {initialData.passingScorePercent}%
                </p>
              </div>
            </div>

            {/* Exam Instructions & Integrity Policy */}
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <AlertTriangle className="h-4 w-4 text-purple-400" />
                <span>Examination Protocol & Policies</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-slate-300">Single Attempt:</strong> Once submitted, you cannot retake this formal assessment.
                </li>
                <li>
                  <strong className="text-slate-300">Continuous Timer:</strong> Once begun, the timer cannot be paused. Closing the tab or refreshing does not reset the clock.
                </li>
                <li>
                  <strong className="text-slate-300">Auto-Submission:</strong> When the countdown reaches 00:00, your selected answers will be submitted automatically.
                </li>
                <li>
                  <strong className="text-slate-300">Focus Monitoring:</strong> Window and tab-switch events are recorded as part of the telemetry audit log.
                </li>
                <li>
                  <strong className="text-slate-300">Delayed Explanations:</strong> Detailed explanations and answer keys are suppressed until the batch due date has passed.
                </li>
              </ul>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Ready to begin? Click below when you are seated and prepared.
              </span>

              <Button
                disabled={isStarting}
                onClick={handleBeginAssessment}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-2 px-6 h-10 font-semibold"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Initiating Attempt...</span>
                  </>
                ) : (
                  <>
                    <Timer className="h-4 w-4" />
                    <span>Begin Timed Assessment</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. ACTIVE TIMED EXAM VIEW                            */}
      {/* ---------------------------------------------------- */}
      {isExamActive && activeAttempt && (
        <>
          {/* Prominent Authoritative Countdown Banner */}
          <div
            className={`sticky top-4 z-30 p-4 rounded-xl border backdrop-blur-md shadow-xl flex items-center justify-between gap-4 transition-all ${
              remainingSeconds < 60
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 animate-pulse'
                : remainingSeconds < 300
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                  : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  remainingSeconds < 60
                    ? 'bg-rose-500/20 text-rose-300'
                    : remainingSeconds < 300
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-purple-500/20 text-purple-300'
                }`}
              >
                <Timer className="h-5 w-5" />
              </div>

              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-75">
                  Time Remaining
                </span>
                <p className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none mt-0.5">
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs text-slate-400">
                  {answeredCount} of {totalQuestions} Answered
                </span>
                {tabBlurCount > 0 && (
                  <p className="text-[11px] text-amber-400 font-mono">
                    {tabBlurCount} tab {tabBlurCount === 1 ? 'switch' : 'switches'} detected
                  </p>
                )}
              </div>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmSubmitOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 px-4 font-semibold shadow-md"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Submit Exam</span>
              </Button>
            </div>
          </div>

          {/* Confirmation Modal Overlay */}
          {confirmSubmitOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="text-base font-bold text-slate-100">
                    Confirm Final Submission
                  </h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  You have answered <strong className="text-white">{answeredCount}</strong> of{' '}
                  <strong className="text-white">{totalQuestions}</strong> questions.
                  Once submitted, your attempt will be finalized and you cannot make further changes.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setConfirmSubmitOpen(false)}
                    className="text-slate-400 text-xs"
                  >
                    Return to Questions
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={handleManualSubmit}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Finalizing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Yes, Finalize & Submit</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Question List */}
          <div className="space-y-6">
            {initialData.questions.map((question, qIdx) => {
              const selectedOptionIds = responses[question.id] ?? [];

              return (
                <Card
                  key={question.id}
                  className="border-slate-800 bg-slate-900/60 backdrop-blur-sm"
                >
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
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

                      {selectedOptionIds.length > 0 && (
                        <span className="text-[11px] text-purple-400 font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Answered
                        </span>
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

                        return (
                          <button
                            type="button"
                            key={option.id}
                            disabled={!isExamActive || remainingSeconds <= 0 || isSubmitting}
                            onClick={() => handleSelectOption(question, option.id)}
                            className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-3 transition-all ${
                              !isExamActive || remainingSeconds <= 0 || isSubmitting
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              isSelected
                                ? 'border-purple-500/60 bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/30'
                                : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
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
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. COMPLETED ATTEMPT VIEW                            */}
      {/* ---------------------------------------------------- */}
      {completedAttempt && (
        <div className="space-y-6">
          <Card
            className={`border ${
              completedAttempt.isPassed
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : 'border-slate-800 bg-slate-900/60'
            } backdrop-blur-sm`}
          >
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      completedAttempt.isPassed
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {completedAttempt.isPassed ? (
                      <CheckCircle2 className="h-7 w-7" />
                    ) : (
                      <Clock className="h-7 w-7" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-100">
                      {completedAttempt.isPassed
                        ? 'Formal Assessment Passed'
                        : 'Formal Assessment Completed'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {completedAttempt.isAutoSubmitted
                        ? 'Automatically submitted upon timer completion.'
                        : 'Submitted and evaluated server-side.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-100">
                      {completedAttempt.percentage}%
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {completedAttempt.score} / {completedAttempt.maxScore} points
                    </div>
                  </div>

                  {completedAttempt.isPassed && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 text-xs font-semibold">
                      <Zap className="h-4 w-4" />
                      <span>+20 XP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Telemetry info */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
                <div className="flex items-center gap-4">
                  <span>
                    Submitted:{' '}
                    {new Date(completedAttempt.submittedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>

                  {completedAttempt.tabBlurCount > 0 && (
                    <span className="text-amber-400 font-mono text-[11px]">
                      {completedAttempt.tabBlurCount} tab switch{' '}
                      {completedAttempt.tabBlurCount === 1 ? 'event' : 'events'} logged
                    </span>
                  )}
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs"
                >
                  <Link href="/assessments">Return to Assessments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Explanations Suppression Banner (Section 9.2: Suppressed until dueAt) */}
          {completedAttempt.explanationsSuppressed ? (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardContent className="p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                  <EyeOff className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">
                  Detailed Explanations Suppressed
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  In accordance with formal examination integrity protocols, question explanations and authoritative answer keys remain confidential until the cohort deadline{' '}
                  {completedAttempt.publishDate && (
                    <strong className="text-slate-300">
                      ({new Date(completedAttempt.publishDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })})
                    </strong>
                  )}{' '}
                  has elapsed for all batch students.
                </p>
              </CardContent>
            </Card>
          ) : completedAttempt.questionResults ? (
            /* Post-Deadline Published Explanations */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-400" />
                  <span>Question Breakdown & Educational Explanations</span>
                </h3>
                <span className="text-xs text-emerald-400 font-medium">Results Published</span>
              </div>

              {completedAttempt.questionResults.map((result, idx) => (
                <Card
                  key={result.questionId}
                  className={`border ${
                    result.isCorrect
                      ? 'border-emerald-500/30 bg-slate-900/80'
                      : 'border-rose-500/30 bg-slate-900/80'
                  }`}
                >
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          {result.earnedPoints} / {result.points} pts
                        </span>
                      </div>

                      {result.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="h-3.5 w-3.5" />
                          Incorrect
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-100">
                      {result.questionText}
                    </p>

                    {result.explanationText && (
                      <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1">
                        <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Explanation
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {result.explanationText}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
