import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RMS Careers Student Portal',
  description: 'RMS Careers authenticated student portal.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
