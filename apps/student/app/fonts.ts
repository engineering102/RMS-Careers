import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Sans, Newsreader } from 'next/font/google';

// Self-hosted at build time by next/font (no runtime request to Google; CSP font-src 'self').
// Each face is exposed as a CSS variable; app/globals.css maps the active theme's faces onto --font-sans and
// --font-mono, which tailwind.config.ts uses for font-sans / font-mono.
//
// Only the default theme's faces (Graphite: Geist) are preloaded. The browser fetches an @font-face only when the
// page uses it, so the Lab notebook faces (IBM Plex) and the Transcript faces (Newsreader, Instrument Sans) are
// downloaded only by students who pick those themes.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
  preload: false
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false
});
// Variable font (weight and optical size). Listing static weights made next/font fail to parse Google's response.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal'],
  variable: '--font-newsreader',
  display: 'swap',
  preload: false
});
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument',
  display: 'swap',
  preload: false
});

export const fontVariables = [
  geist.variable,
  geistMono.variable,
  plexSans.variable,
  plexMono.variable,
  newsreader.variable,
  instrumentSans.variable
].join(' ');
