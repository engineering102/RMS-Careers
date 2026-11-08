export default function AssessmentsLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8 pb-12" aria-busy="true" aria-label="Loading assessments">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-secondary" />
          <div className="h-8 w-48 rounded-lg bg-secondary" />
          <div className="h-4 w-full max-w-xl rounded bg-secondary/60" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="h-3 w-16 rounded bg-secondary" />
              <div className="h-7 w-12 rounded bg-secondary" />
              <div className="h-3 w-24 rounded bg-secondary/60" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-20 rounded bg-secondary" />
          ))}
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-secondary" />
            ))}
          </div>
          <div className="h-9 w-full rounded-md bg-secondary sm:w-64" />
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
              <div className="h-9 w-9 shrink-0 rounded-md bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 max-w-sm rounded bg-secondary" />
                <div className="h-3 w-1/2 max-w-xs rounded bg-secondary/60" />
              </div>
              <div className="hidden h-8 w-28 rounded-md bg-secondary sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
