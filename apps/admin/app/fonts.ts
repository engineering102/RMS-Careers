import { Inter, JetBrains_Mono } from 'next/font/google';

// Self-hosted at build time by next/font (no runtime request to Google; CSP font-src 'self').
// Exposed as CSS variables consumed by fontFamily.sans / fontFamily.mono in tailwind.config.ts.
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});

export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
});

export const fontVariables = `${fontSans.variable} ${fontMono.variable}`;
