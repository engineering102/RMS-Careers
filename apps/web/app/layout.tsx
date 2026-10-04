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
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('rms-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Header />
        <main className="flex-1 w-full" id="main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
