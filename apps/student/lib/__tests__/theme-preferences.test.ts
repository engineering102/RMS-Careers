import { describe, expect, it } from 'vitest';
import {
  COLOR_MODE_COOKIE,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEMES,
  THEME_COOKIE,
  THEME_OPTIONS,
  parseColorMode,
  parseTheme,
  preferenceCookie
} from '@/lib/theme/preferences';

describe('theme preferences', () => {
  it('accepts every known theme and falls back to the default otherwise', () => {
    for (const theme of THEMES) expect(parseTheme(theme)).toBe(theme);
    expect(parseTheme(undefined)).toBe(DEFAULT_THEME);
    expect(parseTheme('')).toBe(DEFAULT_THEME);
    expect(parseTheme('Graphite')).toBe(DEFAULT_THEME);
    expect(parseTheme('graphite; Domain=.rms-careers.com')).toBe(DEFAULT_THEME);
  });

  it('accepts system, light and dark and falls back to system', () => {
    expect(parseColorMode('light')).toBe('light');
    expect(parseColorMode('dark')).toBe('dark');
    expect(parseColorMode('system')).toBe('system');
    expect(parseColorMode('sepia')).toBe(DEFAULT_COLOR_MODE);
    expect(parseColorMode(null)).toBe('system');
  });

  it('lists one picker option per theme, at most three', () => {
    expect(THEME_OPTIONS.map((o) => o.id)).toEqual([...THEMES]);
    expect(THEMES.length).toBeLessThanOrEqual(3);
  });

  it('writes host-only cookies (no Domain), Secure only on HTTPS', () => {
    const cookie = preferenceCookie(THEME_COOKIE, 'notebook', true);
    expect(cookie).toBe('rms_theme=notebook; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
    expect(cookie).not.toMatch(/domain/i);
    expect(preferenceCookie(COLOR_MODE_COOKIE, 'dark', false)).not.toMatch(/Secure/);
  });
});
