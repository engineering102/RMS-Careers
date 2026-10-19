'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { ChevronsDownUp, ChevronsUpDown, Clock, Code2, ListChecks, SearchX, Search, Shuffle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordDsaProblemSolved } from '@/lib/actions/dsa';
import {
  groupByPattern,
  hasActiveFilters,
  initialOpenPatterns,
  isSolved,
  matchesFilters,
  pickRandomUnsolved,
  SHEET_CATEGORY_LABELS,
  type SheetFilters,
  type StatusFilter
} from '@/lib/dsa/sheet-view';
import { DsaProgressCard, type DifficultyCounts } from './dsa-header';
import { PatternAccordion } from './pattern-accordion';
import { ProblemDetailModal } from './problem-detail-modal';
import type { DSAQuestion, DSASheet, Difficulty, StudentProblemProgress } from '@/lib/types/dsa';

interface SheetPracticeViewProps {
  sheet: DSASheet;
  /** The student's progress for this sheet's problems, keyed by problem slug. */
  initialProgressMap: Record<string, StudentProblemProgress>;
  /** A problem to open straight away (`?problem=` deep link). */
  initialProblemSlug?: string;
  batchId?: string;
  progressUnavailable?: boolean;
}

const DEFAULT_FILTERS: SheetFilters = { query: '', difficulty: 'all', status: 'all' };

const DIFFICULTY_LABELS: Record<Difficulty | 'all', string> = { all: 'All levels', easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const STATUS_LABELS: Record<StatusFilter, string> = { all: 'Any status', unsolved: 'Unsolved', solved: 'Solved' };

export function SheetPracticeView({
  sheet,
  initialProgressMap,
  initialProblemSlug,
  batchId,
  progressUnavailable = false
}: SheetPracticeViewProps) {
  const [filters, setFilters] = useState<SheetFilters>(DEFAULT_FILTERS);
  const [progressMap, setProgressMap] = useState<Record<string, StudentProblemProgress>>(initialProgressMap);
  // Patterns the student opened while browsing, and patterns they closed while a filter is active (matching
  // patterns open by default then). Kept apart so clearing a filter restores the browsing layout.
  const [openPatterns, setOpenPatterns] = useState<Set<string>>(
    () => new Set(initialOpenPatterns(sheet, initialProgressMap, initialProblemSlug))
  );
  const [closedWhileFiltering, setClosedWhileFiltering] = useState<Set<string>>(new Set());
  const [selectedQuestion, setSelectedQuestion] = useState<DSAQuestion | null>(
    () => sheet.questions.find((q) => q.slug === initialProblemSlug) ?? null
  );
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const filtering = hasActiveFilters(filters);
  const visible = useMemo(
    () => sheet.questions.filter((q) => matchesFilters(q, filters, progressMap)),
    [sheet, filters, progressMap]
  );
  const groups = useMemo(() => groupByPattern(sheet, visible, progressMap), [sheet, visible, progressMap]);

  const progress = useMemo(() => {
    const byDifficulty: DifficultyCounts = {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 }
    };
    let solved = 0;
    for (const q of sheet.questions) {
      const done = isSolved(progressMap, q.slug);
      byDifficulty[q.difficulty].total += 1;
      if (done) {
        byDifficulty[q.difficulty].solved += 1;
        solved += 1;
      }
    }
    return { solved, total: sheet.questions.length, byDifficulty };
  }, [sheet, progressMap]);

  const isOpen = (pattern: string) => (filtering ? !closedWhileFiltering.has(pattern) : openPatterns.has(pattern));
  const allOpen = groups.length > 0 && groups.every((g) => isOpen(g.pattern));

  const updateFilters = (next: Partial<SheetFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setClosedWhileFiltering(new Set());
  };

  const togglePattern = (pattern: string) => {
    const flip = (prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(pattern)) next.delete(pattern);
      else next.add(pattern);
      return next;
    };
    if (filtering) setClosedWhileFiltering(flip);
    else setOpenPatterns(flip);
  };

  const toggleAll = () => {
    const patterns = groups.map((g) => g.pattern);
    if (filtering) setClosedWhileFiltering(allOpen ? new Set(patterns) : new Set());
    else setOpenPatterns(allOpen ? new Set() : new Set(patterns));
  };

  const markSolved = (slug: string, details?: { submissionUrl: string | null; notes: string | null }) => {
    setProgressMap((prev) => {
      const now = new Date();
      return {
        ...prev,
        [slug]: {
          problemSlug: slug,
          isCompleted: true,
          submissionUrl: details ? details.submissionUrl : (prev[slug]?.submissionUrl ?? null),
          notes: details ? details.notes : (prev[slug]?.notes ?? null),
          completedAt: prev[slug]?.completedAt ?? now,
          updatedAt: now
        }
      };
    });
  };

  // The action revalidates /dsa, so the catalog and overall totals are fresh on the way back.
  const handleModalSuccess = (
    problemSlug: string,
    _isNewlySolved: boolean,
    _xpAwarded: number,
    details?: { submissionUrl: string | null; notes: string | null }
  ) => markSolved(problemSlug, details);

  const handleQuickSolve = (question: DSAQuestion) => {
    if (savingSlug) return;
    setSavingSlug(question.slug);
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await recordDsaProblemSolved({ problemSlug: question.slug, batchId });
        if (result.success) {
          markSolved(question.slug);
          const xp = result.data.xpAwarded;
          setStatus({ text: `${question.title} marked as solved${xp > 0 ? ` · +${xp} XP` : ''}`, isError: false });
        } else {
          setStatus({ text: result.error || 'Could not record progress. Please try again.', isError: true });
        }
      } catch {
        setStatus({ text: 'Could not reach the server. Please try again.', isError: true });
      } finally {
        setSavingSlug(null);
      }
    });
  };

  const pickRandom = () => {
    const question = pickRandomUnsolved(visible, progressMap);
    if (question) {
      setSelectedQuestion(question);
    } else {
      setStatus({ text: 'Everything in view is solved. Nice work!', isError: false });
    }
  };

  const meta = [
    { icon: ListChecks, value: sheet.questions.length, label: sheet.questions.length === 1 ? 'Problem' : 'Problems' },
    { icon: Code2, value: sheet.patternCount, label: sheet.patternCount === 1 ? 'Pattern' : 'Patterns' },
    { icon: Clock, value: sheet.estimatedHours, label: 'Hrs' }
  ];

  return (
    <div className="space-y-6">
      {/* Sheet header */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium text-muted-foreground">
            {sheet.company ?? SHEET_CATEGORY_LABELS[sheet.category]}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{sheet.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{sheet.description}</p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {meta.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="font-semibold text-foreground">{value}</span>{' '}
                  <span className="text-muted-foreground">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <DsaProgressCard
          label="Sheet progress"
          solved={progress.solved}
          total={progress.total}
          byDifficulty={progress.byDifficulty}
          unavailable={progressUnavailable}
        />
      </div>

      {sheet.questions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No problems in this sheet yet"
          description="Problems will appear here once they are added to the sheet."
        />
      ) : (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                aria-label={`Search problems in ${sheet.title}`}
                placeholder="Search by problem, pattern or keyword"
                value={filters.query}
                onChange={(e) => updateFilters({ query: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filters.difficulty}
                onValueChange={(value) => updateFilters({ difficulty: value as Difficulty | 'all' })}
              >
                <SelectTrigger className="h-9 w-full text-sm sm:w-[8.5rem]" aria-label="Filter by difficulty">
                  <SelectValue>{DIFFICULTY_LABELS[filters.difficulty]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value as StatusFilter })}>
                <SelectTrigger className="h-9 w-full text-sm sm:w-[8.5rem]" aria-label="Filter by status">
                  <SelectValue>{STATUS_LABELS[filters.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  <SelectItem value="unsolved">Unsolved</SelectItem>
                  <SelectItem value="solved">Solved</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={pickRandom}
                className="h-9 w-9 shrink-0"
                aria-label="Pick a random unsolved problem"
                title="Pick a random unsolved problem"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleAll}
                disabled={groups.length === 0}
                className="h-9 w-9 shrink-0"
                aria-label={allOpen ? 'Collapse all patterns' : 'Expand all patterns'}
                title={allOpen ? 'Collapse all' : 'Expand all'}
              >
                {allOpen ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Filter summary and quick-solve feedback */}
          {filtering && groups.length > 0 && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {visible.length} {visible.length === 1 ? 'problem' : 'problems'} in {groups.length}{' '}
              {groups.length === 1 ? 'pattern' : 'patterns'} match.{' '}
              <button
                type="button"
                onClick={() => updateFilters(DEFAULT_FILTERS)}
                className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Clear filters
              </button>
            </p>
          )}
          <div aria-live="polite" className="min-h-0">
            {status && (
              <div
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
                  status.isError
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : 'border-success/40 bg-success/10 text-success'
                }`}
              >
                <span>{status.text}</span>
                <button
                  type="button"
                  onClick={() => setStatus(null)}
                  className="rounded p-0.5 opacity-80 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Patterns */}
          {groups.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No problems found"
              description={`Nothing in ${sheet.title} matches your search and filters.`}
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => updateFilters(DEFAULT_FILTERS)}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {groups.map((group) => (
                <PatternAccordion
                  key={group.pattern}
                  sheetSlug={sheet.slug}
                  group={group}
                  isOpen={isOpen(group.pattern)}
                  filtering={filtering}
                  progressMap={progressMap}
                  savingSlug={savingSlug}
                  onToggle={togglePattern}
                  onSelect={setSelectedQuestion}
                  onQuickSolve={handleQuickSolve}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Always mounted: `question={null}` closes it with an exit animation. */}
      <ProblemDetailModal
        question={selectedQuestion}
        progress={selectedQuestion ? progressMap[selectedQuestion.slug] : undefined}
        batchId={batchId}
        onClose={() => setSelectedQuestion(null)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
