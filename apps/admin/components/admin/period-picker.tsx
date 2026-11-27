'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarRange, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PERIOD_KEYS, PERIOD_LABELS, type PeriodKey } from '@/lib/analytics/periods';
import { formatIstDay, periodQuery } from '@/lib/analytics/period-format';

export interface PeriodPickerValue {
  key: PeriodKey;
  from: string;
  to: string;
  days: number;
}

/**
 * Period selector for analytics pages. Changing it navigates to the same path with ?period=… so the
 * server re-renders the numbers; `onPendingChange` lets the page dim stale content meanwhile.
 */
export function PeriodPicker({
  period,
  onPendingChange
}: {
  period: PeriodPickerValue;
  onPendingChange?: (pending: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [choice, setChoice] = React.useState<PeriodKey>(period.key);
  const [from, setFrom] = React.useState(period.from);
  const [to, setTo] = React.useState(period.to);
  const id = React.useId();

  React.useEffect(() => {
    setChoice(period.key);
    setFrom(period.from);
    setTo(period.to);
  }, [period.key, period.from, period.to]);

  React.useEffect(() => onPendingChange?.(isPending), [isPending, onPendingChange]);

  const go = (key: PeriodKey, f = from, t = to) =>
    startTransition(() =>
      router.push(`${pathname}?${periodQuery({ key, from: f, to: t })}`, { scroll: false })
    );

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`${id}-period`}>
          Period
        </label>
        <Select
          value={choice}
          onValueChange={(v) => {
            const key = v as PeriodKey;
            setChoice(key);
            if (key !== 'custom') go(key);
          }}
        >
          <SelectTrigger id={`${id}-period`} className="w-44 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_KEYS.map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {PERIOD_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {choice === 'custom' && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!from || !to || from > to) {
              toast.error('Choose a start date on or before the end date.');
              return;
            }
            go('custom', from, to);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`${id}-from`}>
              From
            </label>
            <Input
              id={`${id}-from`}
              type="date"
              className="h-9 text-xs w-40"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`${id}-to`}>
              To
            </label>
            <Input
              id={`${id}-to`}
              type="date"
              className="h-9 text-xs w-40"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" className="h-9 text-xs" disabled={isPending}>
            Apply
          </Button>
        </form>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
        <CalendarRange className="h-3.5 w-3.5" />
        <span>
          {formatIstDay(period.from)} to {formatIstDay(period.to)} · {period.days} day
          {period.days === 1 ? '' : 's'} (IST)
        </span>
      </div>
    </div>
  );
}

export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 text-xs gap-1.5 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
