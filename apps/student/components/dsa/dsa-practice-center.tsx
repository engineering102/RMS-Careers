'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, BookOpen, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProblemRow } from './problem-row';
import { ProblemDetailModal } from './problem-detail-modal';
import type { StudentDsaData, DSAQuestion, Difficulty, StudentProblemProgress } from '@/lib/types/dsa';

interface DsaPracticeCenterProps {
  initialData: StudentDsaData;
  initialSheetSlug?: string;
  batchId?: string;
}

export function DsaPracticeCenter({
  initialData,
  initialSheetSlug,
  batchId
}: DsaPracticeCenterProps) {
  const [selectedSheetSlug, setSelectedSheetSlug] = useState<string>(initialSheetSlug || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<DSAQuestion | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, StudentProblemProgress>>(
    initialData.progressMap
  );

  const sheets = initialData.sheets;

  // Filter questions based on selected tab, search query, difficulty, and solved status
  const filteredSheets = useMemo(() => {
    return sheets
      .filter((sheet) => selectedSheetSlug === 'all' || sheet.slug === selectedSheetSlug)
      .map((sheet) => {
        const filteredQuestions = sheet.questions.filter((q) => {
          // Search query
          if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            const matchTitle = q.title.toLowerCase().includes(query);
            const matchPattern = q.pattern.toLowerCase().includes(query);
            const matchStatement = q.problemStatement.toLowerCase().includes(query);
            if (!matchTitle && !matchPattern && !matchStatement) return false;
          }

          // Difficulty
          if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) {
            return false;
          }

          // Solved status
          const isSolved = Boolean(progressMap[q.slug]?.isCompleted);
          if (statusFilter === 'solved' && !isSolved) return false;
          if (statusFilter === 'unsolved' && isSolved) return false;

          return true;
        });

        return {
          ...sheet,
          questions: filteredQuestions
        };
      })
      .filter((sheet) => sheet.questions.length > 0);
  }, [sheets, selectedSheetSlug, searchQuery, difficultyFilter, statusFilter, progressMap]);

  const handleSolveSuccess = (
    problemSlug: string,
    isNewlySolved: boolean,
    xpAwarded: number
  ) => {
    setProgressMap((prev) => ({
      ...prev,
      [problemSlug]: {
        problemSlug,
        isCompleted: true,
        submissionUrl: prev[problemSlug]?.submissionUrl || null,
        notes: prev[problemSlug]?.notes || null,
        completedAt: prev[problemSlug]?.completedAt || new Date(),
        updatedAt: new Date()
      }
    }));
  };

  const totalFilteredProblems = useMemo(() => {
    return filteredSheets.reduce((acc, sheet) => acc + sheet.questions.length, 0);
  }, [filteredSheets]);

  return (
    <div className="space-y-6">
      {/* 1. Sheet Topic Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <Button
          variant={selectedSheetSlug === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedSheetSlug('all')}
          className={`text-xs h-8 px-3 rounded-lg font-medium shrink-0 ${
            selectedSheetSlug === 'all'
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          All Topics
        </Button>
        {sheets.map((sheet) => {
          const isSelected = selectedSheetSlug === sheet.slug;
          return (
            <Button
              key={sheet.slug}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSheetSlug(sheet.slug)}
              className={`text-xs h-8 px-3 rounded-lg font-medium shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {sheet.title}
            </Button>
          );
        })}
      </div>

      {/* 2. Search & Filters Bar */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search problems by title, pattern, or keyword..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-xs bg-slate-950/60 border border-slate-700/80 rounded-md text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Difficulty & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Difficulty Toggle */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 p-0.5 text-xs">
              {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    difficultyFilter === diff
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Status Toggle */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 p-0.5 text-xs">
              {(['all', 'solved', 'unsolved'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Problem Checklist by Sheet */}
      {filteredSheets.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/30">
          <CardContent className="p-12 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-200">No Problems Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No problems match your current search and filter criteria. Try resetting your filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setDifficultyFilter('all');
                setStatusFilter('all');
                setSelectedSheetSlug('all');
              }}
              className="text-xs border-slate-700 text-slate-300"
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredSheets.map((sheet) => (
            <div key={sheet.slug} className="space-y-3">
              {/* Sheet Section Header */}
              <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-2">
                <div>
                  <h2 className="text-base font-bold text-slate-100">{sheet.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{sheet.shortDescription}</p>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {sheet.questions.filter((q) => progressMap[q.slug]?.isCompleted).length} /{' '}
                  {sheet.questions.length} solved
                </span>
              </div>

              {/* Problem Rows */}
              <div className="space-y-2">
                {sheet.questions.map((q) => (
                  <ProblemRow
                    key={q.slug}
                    question={q}
                    progress={progressMap[q.slug]}
                    onSelect={(question) => setSelectedQuestion(question)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Problem Detail & Submission Modal */}
      {selectedQuestion && (
        <ProblemDetailModal
          question={selectedQuestion}
          progress={progressMap[selectedQuestion.slug]}
          batchId={batchId}
          onClose={() => setSelectedQuestion(null)}
          onSuccess={handleSolveSuccess}
        />
      )}
    </div>
  );
}
