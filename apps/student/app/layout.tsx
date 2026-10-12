import './globals.css';
import type { Metadata } from 'next';
import { fontVariables } from './fonts';

export const metadata: Metadata = {
  title: 'RMS Careers Student Portal',
  description: 'RMS Careers authenticated student portal.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The student portal is dark-only; `dark` selects the .dark token set in globals.css.
  return <html lang="en" className={`dark ${fontVariables}`}><body>{children}</body></html>;
}
