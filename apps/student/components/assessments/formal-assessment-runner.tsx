'use client';

import React, { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { formatDate } from '@/lib/format/datetime';
import {
  clearAttemptDraft,
  getDraftStorage,
  loadAttemptDraft,
  mergeResponses,
  saveAttemptDraft
} from '@/lib/client/attempt-draft';

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
        // Authoritative time has reached zero: trigger automatic submission with the latest answers.
        // (Calling handleAutoSubmit directly here captured the responses from when the timer started.)
        autoSubmitRef.current();
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

  // Always points at the newest executeSubmission (current responses and tab-blur count) for the timer.
  const autoSubmitRef = useRef(handleAutoSubmit);
  useEffect(() => {
    autoSubmitRef.current = handleAutoSubmit;
  });

  // Device-local draft: restore answers after a refresh/crash, keep it updated, drop it once submitted.
  const activeAttemptId = activeAttempt?.id ?? null;
  // Set when a draft is restored, so the save effect in the same commit does not overwrite the draft
  // with the not-yet-merged responses.
  const skipNextDraftSaveRef = useRef(false);
  useEffect(() => {
    if (!activeAttemptId) return;
    const draft = loadAttemptDraft(getDraftStorage(), activeAttemptId, initialData.questions);
    if (Object.keys(draft).length > 0) {
      skipNextDraftSaveRef.current = true;
      setResponses((current) => mergeResponses(current, draft));
    }
  }, [activeAttemptId, initialData.questions]);

  useEffect(() => {
    if (!activeAttemptId || !isExamActive) return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }
    saveAttemptDraft(getDraftStorage(), activeAttemptId, responses);
  }, [activeAttemptId, isExamActive, responses]);

  useEffect(() => {
    if (completedAttempt?.id) clearAttemptDraft(getDraftStorage(), completedAttempt.id);
  }, [completedAttempt?.id]);

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
            className="text-muted-foreground hover:text-foreground -ml-2 text-xs gap-1.5"
          >
            <Link href="/assessments">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Assessments Center</span>
            </Link>
          </Button>

          <span className="text-muted-foreground">/</span>
          <Link
            href={`/batches/${initialData.batchId}`}
            className="text-xs text-primary hover:text-primary transition-colors"
          >
            {initialData.batchName}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
            {initialData.programCode}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning border border-warning/20 flex items-center gap-1">
            <Timer className="h-3 w-3" />
            Formal Exam ({initialData.timeLimitMinutes}m)
          </span>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. PRE-ATTEMPT BRIEFING VIEW                         */}
      {/* ---------------------------------------------------- */}
      {!isExamActive && !completedAttempt && (
        <Card className="border-border bg-card/60">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                <Timer className="h-4 w-4" />
                <span>Timed Formal Examination</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {initialData.title}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {initialData.description ||
                  'Formal examination aligned with your cohort curriculum. Please ensure you have a stable network connection before starting.'}
              </p>
            </div>

            {/* Exam Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-border">
              <div className="p-3 rounded-lg bg-background/40 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Duration</span>
                <p className="text-sm font-bold text-warning flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {initialData.timeLimitMinutes} Minutes
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background/40 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Total Questions</span>
                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  {totalQuestions} Questions
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background/40 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Total Points</span>
                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                  {initialData.totalPoints} Points
                </p>
              </div>

              <div className="p-3 rounded-lg bg-background/40 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Pass Threshold</span>
                <p className="text-sm font-bold text-success flex items-center gap-1">
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
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-foreground/80">Single Attempt:</strong> Once submitted, you cannot retake this formal assessment.
                </li>
                <li>
                  <strong className="text-foreground/80">Continuous Timer:</strong> Once begun, the timer cannot be paused. Closing the tab or refreshing does not reset the clock.
                </li>
                <li>
                  <strong className="text-foreground/80">Auto-Submission:</strong> When the countdown reaches 00:00, your selected answers will be submitted automatically.
                </li>
                <li>
                  <strong className="text-foreground/80">Focus Monitoring:</strong> Window and tab-switch events are recorded as part of the telemetry audit log.
                </li>
                <li>
                  <strong className="text-foreground/80">Delayed Explanations:</strong> Detailed explanations and answer keys are suppressed until the batch due date has passed.
                </li>
              </ul>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Ready to begin? Click below when you are seated and prepared.
              </span>

              <Button
                disabled={isStarting}
                onClick={handleBeginAssessment}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-2 px-6 h-10 font-semibold"
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
            className={`sticky top-20 z-20 p-4 rounded-xl border backdrop-blur-md shadow-xl flex items-center justify-between gap-4 transition-all ${
              remainingSeconds < 60
                ? 'bg-[color-mix(in_srgb,hsl(var(--destructive))_18%,hsl(var(--card)))] border-destructive/50 text-foreground animate-pulse'
                : remainingSeconds < 300
                  ? 'bg-[color-mix(in_srgb,hsl(var(--warning))_14%,hsl(var(--card)))] border-warning/50 text-foreground'
                  : 'bg-card/90 border-input text-foreground'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  remainingSeconds < 60
                    ? 'bg-destructive/20 text-destructive'
                    : remainingSeconds < 300
                      ? 'bg-warning/20 text-warning'
                      : 'bg-primary/20 text-primary'
                }`}
              >
                <Timer className="h-5 w-5" />
              </div>

              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider opacity-75">
                  Time Remaining
                </span>
                <p className="text-xl sm:text-2xl font-black font-mono tracking-tight leading-none mt-0.5 tabular-nums">
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs text-muted-foreground">
                  {answeredCount} of {totalQuestions} Answered
                </span>
                {tabBlurCount > 0 && (
                  <p className="text-[11px] text-warning font-mono">
                    {tabBlurCount} tab {tabBlurCount === 1 ? 'switch' : 'switches'} detected
                  </p>
                )}
              </div>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmSubmitOpen(true)}
                className="bg-success hover:bg-success/90 text-success-foreground text-xs gap-1.5 px-4 font-semibold shadow-md"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Submit Exam</span>
              </Button>
            </div>
          </div>

          {/* Final-submission confirmation. Closing it is "Return to Questions"; it cannot be dismissed
              while submitting, and the timer closes it before auto-submitting. */}
          <ConfirmDialog
            open={confirmSubmitOpen}
            onOpenChange={setConfirmSubmitOpen}
            title="Confirm Final Submission"
            description={
              <>
                You have answered <strong className="text-foreground">{answeredCount}</strong> of{' '}
                <strong className="text-foreground">{totalQuestions}</strong> questions. Once submitted,
                your attempt will be finalized and you cannot make further changes.
              </>
            }
            confirmLabel="Yes, Finalize & Submit"
            pendingLabel="Finalizing…"
            cancelLabel="Return to Questions"
            pending={isSubmitting}
            onConfirm={handleManualSubmit}
          >
            {errorMessage ? (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </ConfirmDialog>

          {/* Question List */}
          <div className="space-y-6">
            {initialData.questions.map((question, qIdx) => {
              const selectedOptionIds = responses[question.id] ?? [];

              return (
                <Card
                  key={question.id}
                  className="border-border bg-card/60"
                >
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
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

                      {selectedOptionIds.length > 0 && (
                        <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Answered
                        </span>
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

                        return (
                          <button
                            type="button"
                            key={option.id}
                            disabled={!isExamActive || remainingSeconds <= 0 || isSubmitting}
                            onClick={() => handleSelectOption(question, option.id)}
                            className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm flex items-start gap-3 transition-all active:scale-[0.99] motion-reduce:active:scale-100 ${
                              !isExamActive || remainingSeconds <= 0 || isSubmitting
                                ? 'opacity-60 cursor-not-allowed'
                                : 'cursor-pointer'
                            } ${
                              isSelected
                                ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/30'
                                : 'border-border bg-background/40 text-foreground/80 hover:border-input hover:bg-secondary/40'
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
                ? 'border-success/40 bg-success/5'
                : 'border-border bg-card/60'
            }`}
          >
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl border ${
                      completedAttempt.isPassed
                        ? 'bg-success/20 border-success/30 text-success'
                        : 'bg-secondary border-input text-foreground/80'
                    }`}
                  >
                    {completedAttempt.isPassed ? (
                      <CheckCircle2 className="h-7 w-7" />
                    ) : (
                      <Clock className="h-7 w-7" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {completedAttempt.isPassed
                        ? 'Formal Assessment Passed'
                        : 'Formal Assessment Completed'}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {completedAttempt.isAutoSubmitted
                        ? 'Automatically submitted upon timer completion.'
                        : 'Submitted and evaluated server-side.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground tabular-nums">
                      {completedAttempt.percentage}%
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {completedAttempt.score} / {completedAttempt.maxScore} points
                    </div>
                  </div>

                  {completedAttempt.isPassed && (
                    <div className="px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning flex items-center gap-1.5 text-xs font-semibold">
                      <Zap className="h-4 w-4" />
                      <span>+20 XP</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Telemetry info */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
                <div className="flex items-center gap-4">
                  <span>
                    Submitted:{' '}
                    {formatDate(completedAttempt.submittedAt, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>

                  {completedAttempt.tabBlurCount > 0 && (
                    <span className="text-warning font-mono text-[11px]">
                      {completedAttempt.tabBlurCount} tab switch{' '}
                      {completedAttempt.tabBlurCount === 1 ? 'event' : 'events'} logged
                    </span>
                  )}
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-input bg-card/60 hover:bg-secondary text-foreground/80 text-xs"
                >
                  <Link href="/assessments">Return to Assessments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Explanations Suppression Banner (Section 9.2: Suppressed until dueAt) */}
          {completedAttempt.explanationsSuppressed ? (
            <Card className="border-border bg-card/40">
              <CardContent className="p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-secondary/80 border border-input flex items-center justify-center text-muted-foreground">
                  <EyeOff className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Detailed Explanations Suppressed
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  In accordance with formal examination integrity protocols, question explanations and authoritative answer keys remain confidential until the cohort deadline{' '}
                  {completedAttempt.publishDate && (
                    <strong className="text-foreground/80">
                      ({formatDate(completedAttempt.publishDate, {
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
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-purple-400" />
                  <span>Question Breakdown & Educational Explanations</span>
                </h3>
                <span className="text-xs text-success font-medium">Results Published</span>
              </div>

              {completedAttempt.questionResults.map((result, idx) => (
                <Card
                  key={result.questionId}
                  className={`border ${
                    result.isCorrect
                      ? 'border-success/30 bg-card/80'
                      : 'border-destructive/30 bg-card/80'
                  }`}
                >
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-secondary border border-input text-xs font-bold text-foreground/80 font-mono">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.earnedPoints} / {result.points} pts
                        </span>
                      </div>

                      {result.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                          <XCircle className="h-3.5 w-3.5" />
                          Incorrect
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-foreground">
                      {result.questionText}
                    </p>

                    {result.explanationText && (
                      <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                        <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Explanation
                        </span>
                        <p className="text-xs text-foreground/80 leading-relaxed">
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
