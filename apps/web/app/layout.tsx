import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://rmscareers.com'),
  title: {
    default: 'RMS Careers | Technical Education & Structured Learning Platform',
    template: '%s | RMS Careers'
  },
  description:
    'RMS Careers delivers structured computer science curriculum, data structures & algorithms tracks, and career preparation programs designed in collaboration with academic institutions and industry practitioners.',
  keywords: [
    'RMS Careers',
    'Technical Education',
    'Data Structures and Algorithms',
    'Computer Science Curriculum',
    'Full Stack Development',
    'Campus Placements',
    'DSA Sheets'
  ],
  authors: [{ name: 'RMS Careers' }],
  creator: 'RMS Careers',
  publisher: 'RMS Careers',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rmscareers.com',
    siteName: 'RMS Careers',
    title: 'RMS Careers | Technical Education & Structured Learning Platform',
    description:
      'Structured technical learning, free starter DSA sheets, and career training programs for engineers and technical students.',
    images: [
      {
        url: '/rms-logo.jpg',
        width: 800,
        height: 800,
        alt: 'RMS Careers'
      }
    ]
  },
  twitter: {
    card: 'summary',
    title: 'RMS Careers | Technical Education & Structured Learning Platform',
    description:
      'Structured technical learning, free starter DSA sheets, and career training programs for engineers and technical students.',
    images: ['/rms-logo.jpg']
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground">
        <Header />
        <main className="flex-1 w-full" id="main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
