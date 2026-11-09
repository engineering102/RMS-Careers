'use client';

import * as React from 'react';
import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLOR_MODE_OPTIONS, THEME_OPTIONS, type ColorMode } from '@/lib/theme/preferences';
import { useAppearance } from './use-appearance';

const MODE_ICONS: Record<ColorMode, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

/**
 * Header control for theme and colour mode: one click opens it, one more applies a choice. The button shows the
 * current colour mode. Choices apply instantly and are saved on this device (see lib/theme/preferences.ts).
 */
export function AppearanceMenu() {
  const { theme, mode, setTheme, setMode } = useAppearance();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const ButtonIcon = MODE_ICONS[mode ?? 'system'];

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-accent hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
        aria-label="Appearance"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <ButtonIcon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Appearance"
          // Phones: pinned under the header across the screen, since the button sits too far left to anchor to.
          className="fixed inset-x-3 top-14 z-50 origin-top-right sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72 overflow-hidden rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl duration-150 ease-out-quint animate-in fade-in-0 zoom-in-[0.97]"
        >
          {/* Fieldsets default to min-width: min-content and would push the rows past the panel edge. */}
          <fieldset className="min-w-0">
            <legend className="text-xs font-medium text-muted-foreground">Colour mode</legend>
            <div className="mt-2 grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-muted p-0.5">
              {COLOR_MODE_OPTIONS.map((option) => {
                const selected = mode === option.id;
                const Icon = MODE_ICONS[option.id];
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-1 rounded-md py-1.5 text-xs transition-colors duration-150',
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      selected ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <input
                      type="radio"
                      name="header-color-mode"
                      value={option.id}
                      checked={selected}
                      onChange={() => setMode(option.id)}
                      className="sr-only"
                    />
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-3 min-w-0">
            <legend className="text-xs font-medium text-muted-foreground">Theme</legend>
            <div className="mt-1.5 flex flex-col gap-0.5">
              {THEME_OPTIONS.map((option) => {
                const selected = theme === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150',
                      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                      selected ? 'bg-accent' : 'hover:bg-accent/60'
                    )}
                  >
                    <input
                      type="radio"
                      name="header-theme"
                      value={option.id}
                      checked={selected}
                      onChange={() => setTheme(option.id)}
                      className="sr-only"
                    />
                    {/* A swatch drawn in the option's own theme and the current colour mode. */}
                    <span
                      data-theme={option.id}
                      data-mode={mode ?? 'system'}
                      aria-hidden="true"
                      className="flex h-7 w-9 shrink-0 items-center justify-center gap-0.5 rounded-[var(--radius)] border border-border bg-background"
                    >
                      <span className="h-3.5 w-1.5 rounded-sm bg-foreground" />
                      <span className="h-3.5 w-1.5 rounded-sm bg-primary" />
                      <span className="h-3.5 w-1.5 rounded-sm bg-muted-foreground/50" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{option.label}</span>
                      <span className="block text-xs leading-snug text-muted-foreground">{option.description}</span>
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <p className="mt-2 px-0.5 text-xs text-muted-foreground">Saved on this device.</p>
        </div>
      )}
    </div>
  );
}
