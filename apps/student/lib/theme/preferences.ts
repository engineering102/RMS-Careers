/**
 * Appearance preferences for the student portal: a theme (palette, typefaces, radius) and a colour mode.
 *
 * Both live in host-only cookies on student.rms-careers.com (no Domain attribute, so nothing is shared with the
 * other portals). The root layout reads them on the server and writes them onto <html> as data attributes, so the
 * first paint is already in the right theme. "system" mode needs no script: globals.css follows
 * prefers-color-scheme for it.
 *
 * Adding a theme: append it to THEMES and THEME_OPTIONS, add its token blocks to app/globals.css and, if it uses
 * other typefaces, load them in app/fonts.ts with `preload: false`.
 */

export const THEMES = ['graphite', 'notebook', 'transcript'] as const;
export type ThemeName = (typeof THEMES)[number];

export const COLOR_MODES = ['system', 'light', 'dark'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const DEFAULT_THEME: ThemeName = 'graphite';
export const DEFAULT_COLOR_MODE: ColorMode = 'system';

export const THEME_COOKIE = 'rms_theme';
export const COLOR_MODE_COOKIE = 'rms_color_mode';
/** One year: a preference, not a session. */
export const PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface ThemeOption {
  id: ThemeName;
  label: string;
  description: string;
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: 'graphite', label: 'Graphite', description: 'Neutral greys, ink buttons, Geist type' },
  { id: 'notebook', label: 'Lab notebook', description: 'Ink blue on graph paper, IBM Plex type' },
  { id: 'transcript', label: 'Transcript', description: 'Deep green on white, Newsreader serif titles' }
];

export const COLOR_MODE_OPTIONS: readonly { id: ColorMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' }
];

export function parseTheme(value: string | undefined | null): ThemeName {
  return (THEMES as readonly string[]).includes(value ?? '') ? (value as ThemeName) : DEFAULT_THEME;
}

export function parseColorMode(value: string | undefined | null): ColorMode {
  return (COLOR_MODES as readonly string[]).includes(value ?? '') ? (value as ColorMode) : DEFAULT_COLOR_MODE;
}

/** Cookie string for document.cookie. Host-only (no Domain) by design; Secure whenever the page is on HTTPS. */
export function preferenceCookie(name: string, value: string, secure: boolean): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${PREFERENCE_COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}
