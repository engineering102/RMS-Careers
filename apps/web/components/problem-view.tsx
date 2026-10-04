'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Code2,
  HelpCircle,
  Lightbulb,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import type { DSAQuestion } from '@/lib/data/dsa-sheets';
import {
  isAnonymousProblemSolved,
  toggleAnonymousProblemSolved
} from '@/lib/client/anonymous-progress';

type Lang = 'python' | 'cpp' | 'java' | 'javascript';

export function ProblemView({
  question,
  sheetSlug
}: {
  question: DSAQuestion;
  sheetSlug: string;
}) {
  const [isSolved, setIsSolved] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('python');
  const [showHints, setShowHints] = useState(false);
  const [showApproach, setShowApproach] = useState(false);

  useEffect(() => {
    const updateState = () => {
      setIsSolved(isAnonymousProblemSolved(sheetSlug, question.id));
    };

    updateState();
    window.addEventListener('rms:anonymous-progress-updated', updateState);
    return () => window.removeEventListener('rms:anonymous-progress-updated', updateState);
  }, [sheetSlug, question.id]);

  const handleToggleSolved = () => {
    const next = !isSolved;
    setIsSolved(next);
    toggleAnonymousProblemSolved(sheetSlug, question.id, next);
  };

  const difficultyColors = {
    easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  };

  return (
    <div
      id={question.slug}
      className={`rounded-2xl border transition-all ${
        isSolved ? 'border-emerald-500/40 bg-card' : 'border-border bg-card'
      } p-6 sm:p-8 shadow-sm space-y-6`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                difficultyColors[question.difficulty]
              } capitalize`}
            >
              {question.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              <Layers className="h-3 w-3" />
              {question.pattern}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            {question.title}
          </h3>
        </div>

        {/* Local Solve Toggle */}
        <button
          type="button"
          onClick={handleToggleSolved}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isSolved
              ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
              : 'border border-border bg-secondary text-secondary-foreground hover:bg-muted'
          }`}
          aria-pressed={isSolved}
        >
          {isSolved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Solved (Local)</span>
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" />
              <span>Mark as Solved</span>
            </>
          )}
        </button>
      </div>

      {/* Problem Statement */}
      <div className="prose dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed">
        <p>{question.problemStatement}</p>
      </div>

      {/* Examples */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Examples
        </h4>
        <div className="space-y-2">
          {question.examples.map((ex, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-muted/50 border border-border/80 p-3.5 font-mono text-xs space-y-1"
            >
              <div>
                <strong className="text-foreground">Input:</strong>{' '}
                <span className="text-muted-foreground">{ex.input}</span>
              </div>
              <div>
                <strong className="text-foreground">Output:</strong>{' '}
                <span className="text-primary font-semibold">{ex.output}</span>
              </div>
              {ex.explanation && (
                <div className="text-muted-foreground pt-1 border-t border-border/40 font-sans">
                  <strong>Explanation:</strong> {ex.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Constraints & Complexity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-1.5">
          <div className="font-semibold text-foreground">Constraints:</div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground font-mono">
            {question.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-1.5">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Target Complexity:</span>
          </div>
          <div className="text-muted-foreground space-y-0.5 font-mono">
            <div>Time: <span className="text-foreground font-semibold">{question.timeComplexity}</span></div>
            <div>Space: <span className="text-foreground font-semibold">{question.spaceComplexity}</span></div>
          </div>
        </div>
      </div>

      {/* Code Templates Selector */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Code2 className="h-4 w-4 text-primary" />
            Starter Code Template
          </span>
          <div className="flex items-center gap-1 text-xs">
            {(['python', 'cpp', 'java', 'javascript'] as Lang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
                  activeLang === lang
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JS' : lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <pre className="rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-100 overflow-x-auto leading-relaxed">
          <code>{question.starterCode[activeLang]}</code>
        </pre>
      </div>

      {/* Hints & Approach Accordions */}
      <div className="pt-2 flex flex-wrap gap-3">
        {question.hints.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHints(!showHints)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-foreground hover:bg-muted transition-colors"
          >
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <span>{showHints ? 'Hide Hints' : `Show Hints (${question.hints.length})`}</span>
            {showHints ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowApproach(!showApproach)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-muted/60 text-foreground hover:bg-muted transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
          <span>{showApproach ? 'Hide Solution Approach' : 'Show Solution Approach'}</span>
          {showApproach ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {showHints && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-2">
          <div className="font-semibold text-amber-700 dark:text-amber-400">Hints:</div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
            {question.hints.map((hint, idx) => (
              <li key={idx}>{hint}</li>
            ))}
          </ol>
        </div>
      )}

      {showApproach && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-2">
          <div className="font-semibold text-blue-700 dark:text-blue-400">Algorithmic Approach:</div>
          <p className="text-muted-foreground leading-relaxed">{question.approach}</p>
        </div>
      )}

      {/* Architectural Guarantee Footer */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Anonymous Session: Local browser storage only
        </span>
        <span className="hidden sm:inline">Zero DB writes • Zero XP mutations</span>
      </div>
    </div>
  );
}
