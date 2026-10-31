'use client';

/** Dashboard error boundary: a retry, never the error's details (plan §11, §14.4). */
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-lg space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <h1 className="text-lg font-semibold">This page could not be loaded</h1>
      <p className="text-sm text-muted-foreground">Something went wrong on our side. Try again; if it keeps happening, contact the RMS team.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Try again
      </button>
    </div>
  );
}
