'use client';

import * as React from 'react';
import {
  COLOR_MODE_COOKIE,
  THEME_COOKIE,
  parseColorMode,
  parseTheme,
  preferenceCookie,
  type ColorMode,
  type ThemeName
} from '@/lib/theme/preferences';

/** Fired on <html> after a preference changes, so every appearance control on the page stays in step. */
const APPEARANCE_EVENT = 'rms:appearance-change';

/**
 * Applies a preference to <html> and stores it. The switch is instant: transitions are suppressed for two frames so
 * colours don't fade one element at a time.
 */
function apply(attribute: 'theme' | 'mode', value: string, cookieName: string) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset[attribute] = value;
  document.cookie = preferenceCookie(cookieName, value, window.location.protocol === 'https:');
  root.dispatchEvent(new Event(APPEARANCE_EVENT));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
}

/**
 * The student's theme and colour mode. The server already rendered both onto <html> from the cookies, so this reads
 * them back from there (null until mounted) instead of passing props through every page.
 */
export function useAppearance() {
  const [theme, setThemeState] = React.useState<ThemeName | null>(null);
  const [mode, setModeState] = React.useState<ColorMode | null>(null);

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setThemeState(parseTheme(root.dataset.theme));
      setModeState(parseColorMode(root.dataset.mode));
    };
    read();
    root.addEventListener(APPEARANCE_EVENT, read);
    return () => root.removeEventListener(APPEARANCE_EVENT, read);
  }, []);

  const setTheme = React.useCallback((value: ThemeName) => apply('theme', value, THEME_COOKIE), []);
  const setMode = React.useCallback((value: ColorMode) => apply('mode', value, COLOR_MODE_COOKIE), []);

  return { theme, mode, setTheme, setMode };
}
