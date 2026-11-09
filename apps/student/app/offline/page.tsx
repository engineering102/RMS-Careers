import { BrandMark } from '@/components/shell/brand-mark';

// Precached by public/sw.js and shown when a page is requested without a connection. Public (outside the
// auth middleware) and free of student data, because the service worker stores it on the device.
export const metadata = {
  title: 'Offline — RMS Student Portal'
};

export default function OfflinePage() {
  return (
    <main className="bg-paper grid min-h-dvh place-items-center bg-background p-5 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-7 shadow-sm sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BrandMark />
          RMS Careers
        </p>
        <h1 className="mt-6 text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight">
          You&apos;re offline
        </h1>
        <p className="mt-2 text-muted-foreground">
          The student portal needs a connection to load your batches, assessments and progress. Nothing you
          submitted has been lost. Reconnect and try again.
        </p>
        <div className="mt-7 border-t border-border pt-4 text-sm">
          {/* A plain link (full navigation) so the service worker retries the network. */}
          <a className="font-medium text-primary hover:underline" href="/overview">
            Try again
          </a>
        </div>
      </section>
    </main>
  );
}
