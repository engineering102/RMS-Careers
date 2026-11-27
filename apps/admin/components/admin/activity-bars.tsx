import type { ActivityBucket } from '@/lib/analytics/report-card';
import { formatIstDay } from '@/lib/analytics/period-format';

const total = (b: ActivityBucket) => b.lectures + b.dsa + b.quizzes;

function bucketLabel(b: ActivityBucket, daily: boolean): string {
  return daily ? formatIstDay(b.from) : `${formatIstDay(b.from)} to ${formatIstDay(b.to)}`;
}

function bucketDetail(b: ActivityBucket, daily: boolean): string {
  const parts = [`${b.lectures} lecture${b.lectures === 1 ? '' : 's'}`, `${b.dsa} DSA`, `${b.quizzes} quiz${b.quizzes === 1 ? '' : 'zes'}`];
  return `${bucketLabel(b, daily)}: ${total(b)} learning actions (${parts.join(', ')})${daily ? '' : `, ${b.activeDays} active day${b.activeDays === 1 ? '' : 's'}`}`;
}

/**
 * Single-series bar chart of learning actions (lectures + DSA + quizzes) per day, or per week for long
 * periods. One series, so no legend: the caption names it. Each bar has a hover tooltip, and a table
 * view carries the same numbers for screen readers and print.
 */
export function ActivityBars({ buckets }: { buckets: ActivityBucket[] }) {
  if (buckets.length === 0) return null;
  const daily = buckets.every((b) => b.from === b.to);
  const max = Math.max(1, ...buckets.map(total));
  const peak = buckets.reduce((best, b) => (total(b) > total(best) ? b : best), buckets[0]);

  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Learning actions per {daily ? 'day' : 'week'}</span>
        <span>Peak {total(peak)}</span>
      </figcaption>
      <div className="relative h-32 border-b border-border" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border/60" />
        <div className="flex h-full items-end gap-[2px]">
          {buckets.map((b) => {
            const value = total(b);
            return (
              <div
                key={b.from}
                className="group relative flex h-full flex-1 items-end"
                title={bucketDetail(b, daily)}
              >
                <div
                  className={
                    value === 0
                      ? 'w-full h-px bg-border'
                      : 'w-full rounded-t-[4px] bg-primary/80 group-hover:bg-primary print:bg-neutral-700'
                  }
                  style={value === 0 ? undefined : { height: `${Math.max(4, (value / max) * 100)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground" aria-hidden="true">
        <span>{formatIstDay(buckets[0].from)}</span>
        <span>{formatIstDay(buckets[buckets.length - 1].to)}</span>
      </div>
      <details className="text-xs print:hidden">
        <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-muted-foreground">
              <th className="font-medium py-1">{daily ? 'Day' : 'Week'}</th>
              <th className="font-medium py-1 text-right">Lectures</th>
              <th className="font-medium py-1 text-right">DSA</th>
              <th className="font-medium py-1 text-right">Quizzes</th>
              {!daily && <th className="font-medium py-1 text-right">Active days</th>}
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.from} className="border-t">
                <td className="py-1">{bucketLabel(b, daily)}</td>
                <td className="py-1 text-right tabular-nums">{b.lectures}</td>
                <td className="py-1 text-right tabular-nums">{b.dsa}</td>
                <td className="py-1 text-right tabular-nums">{b.quizzes}</td>
                {!daily && <td className="py-1 text-right tabular-nums">{b.activeDays}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
