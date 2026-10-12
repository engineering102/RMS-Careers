import React from 'react';
import { CalendarX } from 'lucide-react';

export function BatchWorkspaceEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
        <CalendarX className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No milestones published yet</h3>
      <p className="mt-1.5 text-xs text-muted-foreground max-w-md leading-relaxed">
        No milestones or curriculum items have been scheduled for this batch yet. As your instructor
        publishes weekly modules, they will automatically appear here along your timeline.
      </p>
    </div>
  );
}
