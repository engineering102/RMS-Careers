'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsDownUp, ChevronsUpDown, SearchX, Search, Shuffle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordDsaProblemSolved } from '@/lib/actions/dsa';
import {
  buildSheetViews,
  findDeepLinkedQuestion,
  groupByPattern,
  hasActiveFilters,
  patternAnchorId,
  initialOpenSheets,
  pickRandomUnsolved,
  type SheetFilters,
  type StatusFilter
} from '@/lib/dsa/sheet-view';
import { SheetSection } from './sheet-section';
import { ProblemDetailModal } from './problem-detail-modal';
import type { StudentDsaData, DSAQuestion, Difficulty, StudentProblemProgress } from '@/lib/types/dsa';

interface DsaPracticeCenterProps {
  initialData: StudentDsaData;
  initialSheetSlug?: string;
  batchId?: string;
}

const DEFAULT_FILTERS: SheetFilters = { query: '', difficulty: 'all', status: 'all' };

const DIFFICULTY_LABELS: Record<Difficulty | 'all', string> = { all: 'All levels', easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const STATUS_LABELS: Record<StatusFilter, string> = { all: 'Any status', unsolved: 'Unsolved', solved: 'Solved' };

export function DsaPracticeCenter({ initialData, initialSheetSlug, batchId }: DsaPracticeCenterProps) {
  const sheets = initialData.sheets;
  const [filters, setFilters] = useState<SheetFilters>(DEFAULT_FILTERS);
  const [progressMap, setProgressMap] = useState<Record<string, StudentProblemProgress>>(initialData.progressMap);
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(
    () => new Set(initialOpenSheets(sheets, initialData.progressMap, initialSheetSlug))
  );
  // A curriculum deep link to a single problem opens it straight away.
  const [selectedQuestion, setSelectedQuestion] = useState<DSAQuestion | null>(() =>
    findDeepLinkedQuestion(sheets, initialSheetSlug)
  );
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtering = hasActiveFilters(filters);

  // Pattern jump: every pattern of every sheet with its progress (unaffected by filters).
  const patternChips = useMemo(
    () =>
      sheets.flatMap((sheet) =>
        groupByPattern(sheet, sheet.questions, progressMap).map((group) => ({
          sheetSlug: sheet.slug,
          pattern: group.pattern,
          solved: group.solvedCount,
          total: group.totalCount
        }))
      ),
    [sheets, progressMap]
  );
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const jumpToPattern = (sheetSlug: string, pattern: string) => {
    if (filtering) setFilters(DEFAULT_FILTERS); // the group could be filtered out
    setOpenSlugs((prev) => new Set(prev).add(sheetSlug));
    setJumpTarget(patternAnchorId(sheetSlug, pattern));
  };
  // Scroll once the group is rendered (its sheet may have just been opened).
  useEffect(() => {
    if (!jumpTarget) return;
    const target = document.getElementById(jumpTarget);
    if (!target) return;
    target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    setJumpTarget(null);
  }, [jumpTarget, openSlugs, filters]);
  const views = useMemo(() => buildSheetViews(sheets, filters, progressMap), [sheets, filters, progressMap]);
  // While searching or filtering, every matching topic is shown expanded.
  const isOpen = (slug: string) => filtering || openSlugs.has(slug);
  const allOpen = views.length > 0 && views.every((v) => isOpen(v.sheet.slug));

  const markSolved = (slug: string) => {
    setProgressMap((prev) => {
      const now = new Date();
      return {
        ...prev,
        [slug]: {
          problemSlug: slug,
          isCompleted: true,
          submissionUrl: prev[slug]?.submissionUrl ?? null,
          notes: prev[slug]?.notes ?? null,
          completedAt: prev[slug]?.completedAt ?? now,
          updatedAt: now
        }
      };
    });
  };

  const handleModalSuccess = (
    problemSlug: string,
    _isNewlySolved: boolean,
    _xpAwarded: number,
    details?: { submissionUrl: string | null; notes: string | null }
  ) => {
    markSolved(problemSlug);
    if (details) {
      setProgressMap((prev) => ({ ...prev, [problemSlug]: { ...prev[problemSlug], ...details } }));
    }
    // The progress card is server-rendered; refresh it so the totals match the sheet.
    router.refresh();
  };

  const handleQuickSolve = (question: DSAQuestion) => {
    if (savingSlug) return;
    setSavingSlug(question.slug);
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await recordDsaProblemSolved({ problemSlug: question.slug, batchId });
        if (result.success) {
          markSolved(question.slug);
          router.refresh();
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

  const toggleSheet = (slug: string) => {
    if (filtering) return;
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleAll = () => {
    setOpenSlugs(allOpen ? new Set() : new Set(sheets.map((s) => s.slug)));
  };

  const pickRandom = () => {
    const question = pickRandomUnsolved(views, progressMap);
    if (question) {
      setSelectedQuestion(question);
    } else {
      setStatus({ text: 'Everything in view is solved. Nice work!', isError: false });
    }
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
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
            aria-label="Search problems"
            placeholder="Search by problem, pattern or keyword"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filters.difficulty}
            onValueChange={(value) => setFilters((f) => ({ ...f, difficulty: value as Difficulty | 'all' }))}
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
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((f) => ({ ...f, status: value as StatusFilter }))}
          >
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
            disabled={filtering}
            className="h-9 w-9 shrink-0"
            aria-label={allOpen ? 'Collapse all topics' : 'Expand all topics'}
            title={allOpen ? 'Collapse all' : 'Expand all'}
          >
            {allOpen ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Quick-solve feedback */}
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

      {/* Pattern jump */}
      {patternChips.length > 1 && (
        <nav aria-label="Jump to pattern" className="-mx-1 overflow-x-auto scrollbar-none">
          <ul className="flex w-max gap-1.5 px-1 pb-1">
            {patternChips.map((chip) => {
              const done = chip.total > 0 && chip.solved === chip.total;
              return (
                <li key={`${chip.sheetSlug}-${chip.pattern}`}>
                  <button
                    type="button"
                    onClick={() => jumpToPattern(chip.sheetSlug, chip.pattern)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      done
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-border bg-card text-foreground/80 hover:border-input hover:text-foreground'
                    }`}
                  >
                    {chip.pattern}
                    <span className={`tabular-nums ${done ? '' : 'text-muted-foreground'}`}>
                      {chip.solved}/{chip.total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Topics */}
      {views.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <SearchX className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h3 className="mt-3 text-sm font-semibold text-foreground">No problems found</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Nothing matches your search and filters.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-4">
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {views.map((view) => (
            <SheetSection
              key={view.sheet.slug}
              view={view}
              isOpen={isOpen(view.sheet.slug)}
              progressMap={progressMap}
              savingSlug={savingSlug}
              onToggle={toggleSheet}
              onSelect={setSelectedQuestion}
              onQuickSolve={handleQuickSolve}
            />
          ))}
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
