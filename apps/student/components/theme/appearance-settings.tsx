'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLOR_MODE_OPTIONS, THEME_OPTIONS } from '@/lib/theme/preferences';
import { useAppearance } from './use-appearance';

export function AppearanceSettings({ className }: { className?: string }) {
  const { theme, mode, setTheme, setMode } = useAppearance();

  return (
    <section id="appearance" className={cn('scroll-mt-20 space-y-6', className)} aria-labelledby="appearance-heading">
      <div>
        <h2 id="appearance-heading" className="text-base font-semibold text-foreground">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved on this device.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Theme</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const selected = theme === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left transition-[border-color,box-shadow] duration-150',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
                  selected ? 'border-foreground shadow-[0_0_0_1px_hsl(var(--foreground))]' : 'border-border hover:border-border-strong'
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.id}
                  checked={selected}
                  onChange={() => setTheme(option.id)}
                  className="sr-only"
                />
                {/* A live miniature in the option's own theme and the current colour mode. */}
                <span
                  data-theme={option.id}
                  data-mode={mode ?? 'system'}
                  aria-hidden="true"
                  className="bg-paper flex h-24 gap-2 border-b border-border bg-background p-3 font-sans text-foreground"
                >
                  <span className="flex w-14 flex-col gap-1.5 border-r border-border pr-2">
                    <span className="h-1.5 w-8 rounded-sm bg-foreground" />
                    <span className="h-1.5 w-10 rounded-sm bg-accent" />
                    <span className="h-1.5 w-7 rounded-sm bg-muted-foreground/40" />
                    <span className="h-1.5 w-9 rounded-sm bg-muted-foreground/40" />
                  </span>
                  <span className="flex flex-1 flex-col gap-2">
                    <span className="font-display text-[15px] font-semibold leading-none">Aa</span>
                    <span className="flex flex-1 items-center justify-between gap-2 rounded-[var(--radius)] border border-border bg-card px-2">
                      <span className="h-1.5 w-16 rounded-sm bg-muted-foreground/50" />
                      <span className="h-4 w-10 rounded-[calc(var(--radius)-2px)] bg-primary" />
                    </span>
                  </span>
                </span>
                <span className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <span>
                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                  {selected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Colour mode</legend>
        <div className="mt-3 inline-flex rounded-lg border border-border bg-muted p-0.5" role="presentation">
          {COLOR_MODE_OPTIONS.map((option) => {
            const selected = mode === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  'cursor-pointer rounded-md px-3.5 py-1.5 text-sm transition-colors duration-150',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  selected ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <input
                  type="radio"
                  name="color-mode"
                  value={option.id}
                  checked={selected}
                  onChange={() => setMode(option.id)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">System follows your device's light or dark setting.</p>
      </fieldset>
    </section>
  );
}
