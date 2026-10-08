export default function CollegesLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-busy="true">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-64 rounded-lg border bg-muted/40" />
    </div>
  );
}
