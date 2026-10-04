'use client';

import { useState } from 'react';
import { approachContent } from '@/lib/data/homepage-content';
import { CheckCircle2, ChevronRight, Layers, Sparkles } from 'lucide-react';

export function ApproachSection() {
  const [activeStageId, setActiveStageId] = useState<string>('01');
  const activeStage = approachContent.stages.find((s) => s.id === activeStageId) || approachContent.stages[0];

  return (
    <section className="py-16 md:py-24 border-b border-border/70 bg-muted/20 relative" id="approach">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{approachContent.eyebrow}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            {approachContent.headline}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {approachContent.description}
          </p>
          <div className="inline-block px-3 py-1 rounded-md bg-muted border border-border text-xs font-mono text-muted-foreground">
            {approachContent.scopeNote}
          </div>
        </div>

        {/* 5-Stage Connected Framework Visualization */}
        <div className="space-y-8">
          {/* Horizontal Stepper Navigation for Desktop / Tablet */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {approachContent.stages.map((stage) => {
              const isSelected = stage.id === activeStageId;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-card shadow-lg ring-2 ring-primary/20'
                      : 'border-border bg-card/60 hover:bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {stage.code}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground truncate ml-1">
                      {stage.phase}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-foreground leading-snug">
                    {stage.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed Display Panel */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs font-bold">
                  <span>STAGE {activeStage.code}</span>
                  <span>•</span>
                  <span>{activeStage.phase}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  {activeStage.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {activeStage.description}
                </p>
                <div className="pt-2 text-xs font-mono text-muted-foreground">
                  Continuous guidance delivered over the 6-month journey.
                </div>
              </div>

              {/* Topics Breakdown */}
              <div className="lg:col-span-5 bg-muted/40 rounded-2xl p-6 border border-border space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Core Focus Topics
                </div>
                <ul className="space-y-2.5">
                  {activeStage.topics.map((topic, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-sm text-foreground/90 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
