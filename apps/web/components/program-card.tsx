import Link from 'next/link';
import { Calendar, Users, ArrowRight, BookOpen } from 'lucide-react';
import type { PublicProgram } from '@/lib/db/queries/programs';

export function ProgramCard({ program }: { program: PublicProgram }) {
  const formattedStartDate = program.startDate
    ? new Date(program.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-mono font-semibold text-primary">
            {program.code}
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Open for Inquiry
          </span>
        </div>

        <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors mb-2">
          {program.name}
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
          {program.description || 'Comprehensive technical curriculum focused on production engineering standards and interview readiness.'}
        </p>
      </div>

      <div className="pt-4 border-t border-border/80 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {formattedStartDate ? (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Starts {formattedStartDate}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Rolling Cohorts
            </span>
          )}

          {program.capacity > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Capacity: {program.capacity}
            </span>
          )}
        </div>

        <Link
          href={`/programs/${program.code}`}
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>View Curriculum & Details</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
