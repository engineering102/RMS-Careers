'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  PlusCircle,
  Save,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Clock,
  Award,
  AlertTriangle,
  Eye,
  Check,
  FileQuestion,
  Sparkles,
  Layers,
  Globe,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { EmptyState } from '@/components/admin/empty-state';
import { toast } from 'sonner';
import {
  saveQuizConfigAction,
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction
} from './actions';
import type { ContentItemWithDetails, QuizWithDetails, QuizQuestionWithDetails, QuizOption } from '@/lib/db/queries';
import type { QuizTypeEnum, ExplanationPolicyEnum, QuestionTypeEnum } from '@rms/db';

interface QuizAuthoringClientProps {
  contentItem: ContentItemWithDetails;
  initialQuiz: QuizWithDetails;
}

interface QuestionFormState {
  id?: number;
  questionText: string;
  questionType: QuestionTypeEnum;
  points: number;
  options: QuizOption[];
  correctOptionIds: string[];
  explanationText: string;
}

const DEFAULT_OPTIONS: QuizOption[] = [
  { id: 'opt_1', text: '' },
  { id: 'opt_2', text: '' },
  { id: 'opt_3', text: '' },
  { id: 'opt_4', text: '' }
];

export function QuizAuthoringClient({
  contentItem,
  initialQuiz
}: QuizAuthoringClientProps) {
  const router = useRouter();

  // Quiz Configuration State
  const [quizType, setQuizType] = React.useState<QuizTypeEnum>(initialQuiz.quizType);
  const [timeLimitMinutes, setTimeLimitMinutes] = React.useState<string>(
    initialQuiz.timeLimitMinutes ? String(initialQuiz.timeLimitMinutes) : ''
  );
  const [passingScorePercent, setPassingScorePercent] = React.useState<number>(
    initialQuiz.passingScorePercent || 60
  );
  const [showExplanations, setShowExplanations] = React.useState<ExplanationPolicyEnum>(
    initialQuiz.showExplanations || 'immediate'
  );
  const [isSavingConfig, setIsSavingConfig] = React.useState(false);

  // Question Bank State
  const [questions, setQuestions] = React.useState<QuizQuestionWithDetails[]>(
    initialQuiz.questions || []
  );
  const [isQuestionModalOpen, setIsQuestionModalOpen] = React.useState(false);
  const [editingQuestionId, setEditingQuestionId] = React.useState<number | null>(null);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = React.useState(false);
  const [isReordering, setIsReordering] = React.useState(false);

  // Question Form State
  const [questionForm, setQuestionForm] = React.useState<QuestionFormState>({
    questionText: '',
    questionType: 'single_choice',
    points: 1,
    options: [...DEFAULT_OPTIONS],
    correctOptionIds: ['opt_1'],
    explanationText: ''
  });

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const hasAttempts = initialQuiz.attemptCount > 0;

  // Handle Quiz Settings Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);

    try {
      if (quizType === 'formal' && (!timeLimitMinutes || Number(timeLimitMinutes) < 1)) {
        toast.error('Formal timed assessments require a time limit of at least 1 minute.');
        setIsSavingConfig(false);
        return;
      }

      const res = await saveQuizConfigAction(contentItem.id, {
        quizType,
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        passingScorePercent,
        showExplanations
      });

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success('Assessment configuration saved successfully.');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update assessment settings.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Open Create Question Modal
  const openCreateQuestionModal = () => {
    setEditingQuestionId(null);
    setQuestionForm({
      questionText: '',
      questionType: 'single_choice',
      points: 1,
      options: [
        { id: 'opt_1', text: '' },
        { id: 'opt_2', text: '' },
        { id: 'opt_3', text: '' },
        { id: 'opt_4', text: '' }
      ],
      correctOptionIds: ['opt_1'],
      explanationText: ''
    });
    setIsQuestionModalOpen(true);
  };

  // Open Edit Question Modal
  const openEditQuestionModal = (q: QuizQuestionWithDetails) => {
    setEditingQuestionId(q.id);
    setQuestionForm({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      points: q.points || 1,
      options: q.options.map((opt) => ({ ...opt })),
      correctOptionIds: [...q.correctOptionIds],
      explanationText: q.explanationText || ''
    });
    setIsQuestionModalOpen(true);
  };

  // Options Helpers inside Question Modal
  const handleOptionTextChange = (index: number, text: string) => {
    setQuestionForm((prev) => {
      const nextOptions = [...prev.options];
      nextOptions[index] = { ...nextOptions[index], text };
      return { ...prev, options: nextOptions };
    });
  };

  const handleToggleCorrectOption = (optId: string) => {
    setQuestionForm((prev) => {
      if (prev.questionType === 'single_choice') {
        return { ...prev, correctOptionIds: [optId] };
      } else {
        const alreadySelected = prev.correctOptionIds.includes(optId);
        if (alreadySelected) {
          if (prev.correctOptionIds.length === 1) {
            toast.error('At least one correct answer must remain selected.');
            return prev;
          }
          return {
            ...prev,
            correctOptionIds: prev.correctOptionIds.filter((id) => id !== optId)
          };
        } else {
          return {
            ...prev,
            correctOptionIds: [...prev.correctOptionIds, optId]
          };
        }
      }
    });
  };

  const handleAddOption = () => {
    if (questionForm.options.length >= 10) {
      toast.error('Maximum 10 options per question.');
      return;
    }
    const nextId = `opt_${Date.now().toString().slice(-4)}`;
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { id: nextId, text: '' }]
    }));
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (questionForm.options.length <= 2) {
      toast.error('A question must have at least 2 options.');
      return;
    }
    const optionToRemove = questionForm.options[indexToRemove];
    setQuestionForm((prev) => {
      const nextOptions = prev.options.filter((_, i) => i !== indexToRemove);
      let nextCorrect = prev.correctOptionIds.filter((id) => id !== optionToRemove.id);
      if (nextCorrect.length === 0 && nextOptions.length > 0) {
        nextCorrect = [nextOptions[0].id];
      }
      return {
        ...prev,
        options: nextOptions,
        correctOptionIds: nextCorrect
      };
    });
  };

  // Submit Question (Create or Edit)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client Validation
    if (questionForm.questionText.trim().length < 3) {
      toast.error('Question text must be at least 3 characters.');
      return;
    }

    const emptyOption = questionForm.options.find((o) => !o.text.trim());
    if (emptyOption) {
      toast.error('All option text fields must be filled out.');
      return;
    }

    if (questionForm.correctOptionIds.length === 0) {
      toast.error('Please select at least one correct answer.');
      return;
    }

    setIsSubmittingQuestion(true);
    try {
      const payload = {
        questionText: questionForm.questionText.trim(),
        questionType: questionForm.questionType,
        points: Number(questionForm.points) || 1,
        options: questionForm.options.map((o) => ({ id: o.id, text: o.text.trim() })),
        correctOptionIds: questionForm.correctOptionIds,
        explanationText: questionForm.explanationText.trim() || null
      };

      if (editingQuestionId) {
        const res = await updateQuestionAction(contentItem.id, editingQuestionId, payload);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestionId ? res.question : q))
        );
        toast.success('Question updated successfully.');
      } else {
        const res = await createQuestionAction(contentItem.id, initialQuiz.id, payload);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        setQuestions((prev) => [...prev, res.question]);
        toast.success('Question added to assessment.');
      }

      setIsQuestionModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save question.');
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: number) => {
    if (hasAttempts) {
      toast.error(
        'Cannot delete question: Student attempts exist for this assessment. Modifying questions would invalidate historical evaluation records.'
      );
      return;
    }

    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const res = await deleteQuestionAction(contentItem.id, questionId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast.success('Question removed.');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete question.');
    }
  };

  // Reorder Question Up / Down
  const handleMoveQuestion = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setIsReordering(true);
    const reordered = [...questions];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setQuestions(reordered);

    try {
      const questionIds = reordered.map((q) => q.id);
      const res = await reorderQuestionsAction(contentItem.id, initialQuiz.id, {
        questionIds
      });
      if (!res.success) {
        toast.error(res.error);
        setQuestions(questions); // revert
        return;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update question sequence.');
      setQuestions(questions);
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
            <Link href="/content">
              <ArrowLeft className="h-4 w-4" />
              Content Library
            </Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-semibold text-foreground text-sm truncate max-w-[280px]">
            {contentItem.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {contentItem.lifecycleStatus === 'published' ? (
            <Badge
              variant="outline"
              className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Published
            </Badge>
          ) : contentItem.lifecycleStatus === 'draft' ? (
            <Badge
              variant="outline"
              className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
            >
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              Draft
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-slate-500">
              Archived
            </Badge>
          )}

          <Badge variant="secondary" className="gap-1 font-mono text-xs">
            {contentItem.programCode ? (
              <>
                <BookOpen className="h-3 w-3" />
                {contentItem.programCode}
              </>
            ) : (
              <>
                <Globe className="h-3 w-3" />
                Global
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Quiz & Assessment Workbench
          </h1>
          <Badge
            variant={quizType === 'formal' ? 'default' : 'secondary'}
            className="text-xs uppercase tracking-wider"
          >
            {quizType === 'formal' ? 'Formal Assessment' : 'Practice Quiz'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure question bank, scoring parameters, and delivery options for canonical assessment{' '}
          <span className="font-medium text-foreground">/{contentItem.slug}</span>.
        </p>
      </div>

      {/* Attempts Warning Banner */}
      {hasAttempts && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Student Attempts on Record ({initialQuiz.attemptCount})
            </p>
            <p className="text-amber-700/90 dark:text-amber-400/90">
              This assessment has already been attempted by students in assigned batches. Question deletion
              is locked to preserve historical evaluation integrity and student transcripts.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Assessment Configuration Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Assessment Parameters & Scoring Rules
              </CardTitle>
              <CardDescription>
                Determine whether this assessment is formative practice or summative formal evaluation.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Canonical Scope
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Quiz Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assessment Mode *
                </label>
                <Select
                  value={quizType}
                  onValueChange={(val) => {
                    const nextType = val as QuizTypeEnum;
                    setQuizType(nextType);
                    if (nextType === 'formal' && !timeLimitMinutes) {
                      setTimeLimitMinutes('30');
                    }
                    if (nextType === 'formal' && showExplanations === 'immediate') {
                      setShowExplanations('after_deadline');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">Practice (Self-Paced, Repeatable)</SelectItem>
                    <SelectItem value="formal">Formal (Timed, Single Attempt, Proctored)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Limit */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Time Limit (Minutes) {quizType === 'formal' ? '*' : '(Optional)'}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="360"
                  placeholder={quizType === 'formal' ? 'e.g. 45' : 'No limit (self-paced)'}
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(e.target.value)}
                  required={quizType === 'formal'}
                />
              </div>

              {/* Passing Score */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Passing Score (%) *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="60"
                  value={passingScorePercent}
                  onChange={(e) => setPassingScorePercent(Number(e.target.value))}
                  required
                />
              </div>

              {/* Explanations Policy */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Answer Explanations *
                </label>
                <Select
                  value={showExplanations}
                  onValueChange={(val) => setShowExplanations(val as ExplanationPolicyEnum)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select disclosure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate (Upon Submission)</SelectItem>
                    <SelectItem value="after_deadline">After Batch Deadline</SelectItem>
                    <SelectItem value="never">Never (Strict Testing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {quizType === 'formal' ? (
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    Formal mode enforces strict countdown, tab blur alerts, and single attempt per batch.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Practice mode allows unlimited retakes and immediate feedback upon completion.
                  </span>
                )}
              </div>

              <Button type="submit" disabled={isSavingConfig} className="gap-2 shrink-0">
                <Save className="h-4 w-4" />
                {isSavingConfig ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Question Bank Manager */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-primary" />
                Question Bank
              </CardTitle>
              <CardDescription>
                Author questions, configure choices, select correct answers, and assign point values.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
                {questions.length} Question{questions.length === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 text-primary">
                {totalPoints} Total Point{totalPoints === 1 ? '' : 's'}
              </Badge>
              <Button onClick={openCreateQuestionModal} className="gap-1.5 shrink-0" size="sm">
                <PlusCircle className="h-4 w-4" />
                Add Question
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No Questions in Assessment"
              description="This quiz currently has zero questions. Add your first question to activate this evaluation."
              action={
                <Button onClick={openCreateQuestionModal} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add First Question
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const isFirst = index === 0;
                const isLast = index === questions.length - 1;

                return (
                  <div
                    key={question.id}
                    className="group rounded-lg border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Sequence Badge + Question Header */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
                          {index + 1}
                        </span>

                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[11px] font-normal">
                              {question.questionType === 'multiple_choice'
                                ? 'Multiple Choice'
                                : 'Single Choice'}
                            </Badge>
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {question.points} {question.points === 1 ? 'Point' : 'Points'}
                            </Badge>
                          </div>

                          <p className="text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                            {question.questionText}
                          </p>

                          {/* Options List */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {question.options.map((opt) => {
                              const isCorrect = question.correctOptionIds.includes(opt.id);

                              return (
                                <div
                                  key={opt.id}
                                  className={`flex items-start gap-2.5 rounded-md border p-2.5 text-xs transition-colors ${
                                    isCorrect
                                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200 font-medium'
                                      : 'border-border/60 bg-muted/30 text-muted-foreground'
                                  }`}
                                >
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded shrink-0 mt-0.5 ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'border border-muted-foreground/30'
                                    }`}
                                  >
                                    {isCorrect && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                  <span className="flex-1 break-words leading-tight">{opt.text}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation Callout */}
                          {question.explanationText && (
                            <div className="rounded border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-blue-900 dark:text-blue-300 mt-2">
                              <span className="font-semibold">Explanation: </span>
                              {question.explanationText}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isFirst || isReordering}
                          onClick={() => handleMoveQuestion(index, 'up')}
                          className="h-8 w-8 p-0"
                          title="Move up in order"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLast || isReordering}
                          onClick={() => handleMoveQuestion(index, 'down')}
                          className="h-8 w-8 p-0"
                          title="Move down in order"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditQuestionModal(question)}
                          className="h-8 w-8 p-0 text-primary"
                          title="Edit question"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={hasAttempts}
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                          title={
                            hasAttempts
                              ? 'Deletion locked (attempts exist)'
                              : 'Delete question'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Editor Dialog */}
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionId ? 'Edit Assessment Question' : 'Add Question to Bank'}
            </DialogTitle>
            <DialogDescription>
              Configure question statement, multiple-choice options, correct key, and score points.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQuestion} className="space-y-4 py-2">
            {/* Question Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Question Text *</label>
              <textarea
                required
                rows={3}
                className="w-full p-2.5 text-sm rounded-md border border-input bg-background focus:ring-1 focus:ring-primary"
                placeholder="Enter the problem statement or question prompt..."
                value={questionForm.questionText}
                onChange={(e) =>
                  setQuestionForm((prev) => ({ ...prev, questionText: e.target.value }))
                }
              />
            </div>

            {/* Question Type & Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Format *</label>
                <Select
                  value={questionForm.questionType}
                  onValueChange={(val) => {
                    const qType = val as QuestionTypeEnum;
                    setQuestionForm((prev) => {
                      // If switching to single_choice and multiple were selected, keep only the first
                      let nextCorrect = prev.correctOptionIds;
                      if (qType === 'single_choice' && nextCorrect.length > 1) {
                        nextCorrect = [nextCorrect[0]];
                      }
                      return {
                        ...prev,
                        questionType: qType,
                        correctOptionIds: nextCorrect
                      };
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">Single Choice (1 Correct Answer)</SelectItem>
                    <SelectItem value="multiple_choice">
                      Multiple Choice (1+ Correct Answers)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Points Value *</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={questionForm.points}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({
                      ...prev,
                      points: Number(e.target.value) || 1
                    }))
                  }
                />
              </div>
            </div>

            {/* Options Builder */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold">Answer Choices *</label>
                  <p className="text-xs text-muted-foreground">
                    Click the radio/checkbox to designate the correct answer(s).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="gap-1.5 h-8 text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2.5">
                {questionForm.options.map((option, idx) => {
                  const isCorrect = questionForm.correctOptionIds.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      className={`flex items-center gap-2.5 rounded-md border p-2 transition-colors ${
                        isCorrect
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-border/80 bg-background'
                      }`}
                    >
                      {/* Select as Correct */}
                      <button
                        type="button"
                        onClick={() => handleToggleCorrectOption(option.id)}
                        className={`flex h-5 w-5 items-center justify-center rounded cursor-pointer transition-colors shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'border border-muted-foreground/40 hover:border-emerald-600'
                        }`}
                        title={
                          isCorrect ? 'Marked as correct' : 'Click to mark as correct'
                        }
                      >
                        {isCorrect && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>

                      {/* Option Text Input */}
                      <Input
                        required
                        placeholder={`Option ${idx + 1}`}
                        value={option.text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        className="h-9 text-xs flex-1"
                      />

                      {/* Remove Option Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={questionForm.options.length <= 2}
                        onClick={() => handleRemoveOption(idx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        title="Remove option"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Answer Explanation (Optional)</label>
              <textarea
                rows={2}
                className="w-full p-2.5 text-sm rounded-md border border-input bg-background focus:ring-1 focus:ring-primary"
                placeholder="Explain why this answer is correct for students to review..."
                value={questionForm.explanationText}
                onChange={(e) =>
                  setQuestionForm((prev) => ({ ...prev, explanationText: e.target.value }))
                }
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuestionModalOpen(false)}
                disabled={isSubmittingQuestion}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingQuestion} className="gap-2">
                <Save className="h-4 w-4" />
                {isSubmittingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Add Question'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
