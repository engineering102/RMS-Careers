import type { Indicator } from '@rms/academic/tutor/indicators';
import { cn } from '@/lib/utils';

const tone: Record<Indicator['kind'], string> = {
  inactive: 'border-warning/40 bg-warning/10 text-warning',
  never_active: 'border-warning/40 bg-warning/10 text-warning',
  overdue: 'border-destructive/40 bg-destructive/10 text-destructive',
  needs_revision: 'border-info/40 bg-info/10 text-info'
};

/**
 * Tutoring signals (plan §11): text badges with their evidence as a tooltip (title) and, for screen readers and
 * touch screens where tooltips do not show, in the accessible text too. `detailed` prints the evidence inline.
 */
export function IndicatorList({ indicators, detailed = false }: { indicators: Indicator[]; detailed?: boolean }) {
  if (indicators.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', detailed && 'flex-col items-start gap-2')}>
      {indicators.map((i) => (
        <li key={i.kind} className={cn(detailed && 'flex flex-col gap-0.5')}>
          <span title={i.evidence} className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', tone[i.kind])}>
            {i.label}
            {detailed ? null : <span className="sr-only">: {i.evidence}</span>}
          </span>
          {detailed ? <span className="text-xs text-muted-foreground">{i.evidence}</span> : null}
        </li>
      ))}
    </ul>
  );
}
