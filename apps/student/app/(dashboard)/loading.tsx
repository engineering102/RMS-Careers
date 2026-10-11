export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
      {/* Greeting Skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-secondary" />
        <div className="h-8 w-64 rounded bg-secondary" />
        <div className="h-4 w-48 rounded bg-secondary/60" />
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 rounded-xl border border-border bg-card/60 p-5 space-y-3">
            <div className="h-5 w-28 rounded bg-secondary" />
            <div className="h-4 w-full rounded bg-secondary/50" />
            <div className="h-4 w-2/3 rounded bg-secondary/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
