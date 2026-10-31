import './globals.css';
import type { Metadata } from 'next';
import { fontVariables } from './fonts';

export const metadata: Metadata = {
  title: 'RMS Careers Tutor Portal',
  description: 'RMS Careers authenticated tutor portal.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The tutor portal is dark-only (same tokens as the student portal); `dark` selects the .dark token set in globals.css.
  return <html lang="en" className={`dark ${fontVariables}`}><body>{children}</body></html>;
}
