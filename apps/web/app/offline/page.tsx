import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { offlineContent } from '@/lib/data/offline-content';

// Precached by public/sw.js and shown when a page is requested without a connection.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: offlineContent.title,
  robots: { index: false, follow: false }
};

export default function OfflinePage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-24 max-w-xl text-center space-y-6">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <WifiOff className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{offlineContent.heading}</h1>
      <p className="text-muted-foreground">{offlineContent.body}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {offlineContent.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
