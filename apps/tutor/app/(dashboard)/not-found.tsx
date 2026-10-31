import Link from 'next/link';

/** One answer for unknown ids and for batches, students or submissions outside the tutor's assignments. */
export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-border bg-card p-6 text-center">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">This page does not exist or is not part of your assigned batches.</p>
      <Link
        href="/overview"
        className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
      >
        Back to overview
      </Link>
    </div>
  );
}
