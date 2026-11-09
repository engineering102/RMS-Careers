import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { fontVariables } from './fonts';
import { COLOR_MODE_COOKIE, THEME_COOKIE, parseColorMode, parseTheme } from '@/lib/theme/preferences';

export const metadata: Metadata = {
  title: 'RMS Careers Student Portal',
  description: 'RMS Careers authenticated student portal.',
  robots: { index: false, follow: false }
};

// viewport-fit=cover lets the phone tab bar and sheets reach the screen edge; they pad themselves with
// env(safe-area-inset-*) so nothing sits under the home indicator or the notch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Appearance is read on the server so the first paint is already in the student's theme (no flash, no script).
  const store = await cookies();
  const theme = parseTheme(store.get(THEME_COOKIE)?.value);
  const mode = parseColorMode(store.get(COLOR_MODE_COOKIE)?.value);

  return (
    // The theme picker updates these attributes in place after a change, so React must not reset them.
    <html lang="en" className={fontVariables} data-theme={theme} data-mode={mode} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
