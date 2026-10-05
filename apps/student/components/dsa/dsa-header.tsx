import React from 'react';
import { Code2, CheckCircle2, Flame, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DsaProgressSummary } from '@/lib/types/dsa';

interface DsaHeaderProps {
  summary: DsaProgressSummary;
}

export function DsaHeader({ summary }: DsaHeaderProps) {
  const {
    totalProblems,
    totalSolved,
    overallPercentage,
    easyTotal,
    easySolved,
    mediumTotal,
    mediumSolved,
    hardTotal,
    hardSolved
  } = summary;

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Code2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              DSA Practice Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Master pattern-based problem solving for technical interviews. Log problem solutions, attach submission URLs, and maintain your personal revision notes.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Progress */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Overall Progress</span>
              <Award className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-100">{totalSolved}</span>
              <span className="text-xs text-slate-500">/ {totalProblems} solved</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{overallPercentage}% completed</p>
          </CardContent>
        </Card>

        {/* Easy */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span>Easy Problems</span>
              <span className="text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300">
                10 XP
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-400">{easySolved}</span>
              <span className="text-xs text-slate-500">/ {easyTotal}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${easyTotal > 0 ? Math.round((easySolved / easyTotal) * 100) : 0}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {easyTotal > 0 ? Math.round((easySolved / easyTotal) * 100) : 0}% completed
            </p>
          </CardContent>
        </Card>

        {/* Medium */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
              <span>Medium Problems</span>
              <span className="text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300">
                25 XP
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-400">{mediumSolved}</span>
              <span className="text-xs text-slate-500">/ {mediumTotal}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{
                  width: `${mediumTotal > 0 ? Math.round((mediumSolved / mediumTotal) * 100) : 0}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {mediumTotal > 0 ? Math.round((mediumSolved / mediumTotal) * 100) : 0}% completed
            </p>
          </CardContent>
        </Card>

        {/* Hard */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
              <span>Hard Problems</span>
              <span className="text-[11px] bg-rose-500/10 px-1.5 py-0.5 rounded text-rose-300">
                50 XP
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-rose-400">{hardSolved}</span>
              <span className="text-xs text-slate-500">/ {hardTotal}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-300"
                style={{
                  width: `${hardTotal > 0 ? Math.round((hardSolved / hardTotal) * 100) : 0}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {hardTotal > 0 ? Math.round((hardSolved / hardTotal) * 100) : 0}% completed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
