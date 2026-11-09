import React from 'react';
import { CalendarClock } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export function BatchWorkspaceEmptyState() {
  return (
    <EmptyState
      icon={CalendarClock}
      title="Nothing scheduled yet"
      description="Your trainers publish each week's lectures, notes and practice here. Check back once your batch starts."
    />
  );
}
