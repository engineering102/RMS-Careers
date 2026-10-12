'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Library, SearchX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LibraryEmptyStateProps {
  isFiltered: boolean;
}

export function LibraryEmptyState({ isFiltered }: LibraryEmptyStateProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground mb-4 border border-input/60">
          <SearchX className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No matching resources</h3>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-sm leading-relaxed">
          No learning materials match your current search query or topic filter. Try adjusting your
          terms or reset filters.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(pathname)}
          className="mt-5 gap-1.5 text-xs border-input bg-secondary/80 text-foreground/80 hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset all filters</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
        <Library className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Library is being prepared</h3>
      <p className="mt-1.5 text-xs text-muted-foreground max-w-md leading-relaxed">
        No learning materials are currently published for your enrolled programs. As curriculum
        milestones and resources are published, they will automatically appear in your self-paced library.
      </p>
    </div>
  );
}
