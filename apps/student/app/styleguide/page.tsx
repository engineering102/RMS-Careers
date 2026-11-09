import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Stat } from '@/components/ui/stat-card';
import { StatusMark, type ItemStatus } from '@/components/ui/status-mark';
import { Progress } from '@/components/ui/progress';
import { Kbd } from '@/components/ui/kbd';
import { Avatar } from '@/components/ui/avatar';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppearanceSettings } from '@/components/theme/appearance-settings';
import { CONTENT_TYPES } from '@/lib/content/content-types';
import { THEMES, type ThemeName } from '@/lib/theme/preferences';

/*
 * Dev-only reference for the redesign: every token and base component in every theme × colour mode, side by side.
 * Each panel previews a theme by carrying data-theme / data-mode itself (see app/globals.css).
 */
export const metadata = { title: 'Style guide — RMS Student Portal', robots: { index: false, follow: false } };

const SWATCHES: { token: string; label: string; fg?: string }[] = [
  { token: 'background', label: 'background' },
  { token: 'card', label: 'card' },
  { token: 'muted', label: 'muted' },
  { token: 'accent', label: 'accent' },
  { token: 'primary', label: 'primary', fg: 'primary-foreground' },
  { token: 'border', label: 'border' },
  { token: 'input', label: 'input' },
  { token: 'success', label: 'success', fg: 'success-foreground' },
  { token: 'warning', label: 'warning', fg: 'warning-foreground' },
  { token: 'destructive', label: 'destructive', fg: 'destructive-foreground' },
  { token: 'info', label: 'info', fg: 'info-foreground' }
];

function Panel({ theme, mode }: { theme: ThemeName; mode: 'light' | 'dark' }) {
  return (
    <section
      data-theme={theme}
      data-mode={mode}
      className="bg-paper rounded-lg border border-border bg-background p-6 font-sans text-foreground"
      aria-label={`${theme} ${mode}`}
    >
      <p className="font-mono text-xs text-muted-foreground">
        {theme} · {mode}
      </p>

      <div className="mt-4 space-y-1">
        <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight">Good evening, Ananya</h2>
        <p className="font-display tabular text-3xl font-medium">1,240 XP</p>
        <p className="text-sm text-muted-foreground">Batch A · Week 6 · Sliding window and two pointers</p>
        <p className="text-xs text-faint">Faint metadata · updated 2 hours ago</p>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {SWATCHES.map((s) => (
          <div key={s.token} className="space-y-1">
            <div
              className="flex h-10 items-center justify-center rounded-md border border-border text-[11px] font-medium"
              style={{ background: `hsl(var(--${s.token}))`, color: s.fg ? `hsl(var(--${s.fg}))` : undefined }}
            >
              {s.fg ? 'Aa' : ''}
            </div>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button>Continue</Button>
        <Button variant="outline">Open sheet</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Solved</Badge>
        <Badge variant="warning">Due tomorrow</Badge>
        <Badge variant="destructive">Overdue</Badge>
        <Badge variant="info">New</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {Object.keys(CONTENT_TYPES).map((t) => (
          <ContentTypeTag key={t} type={t} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 border-y border-border">
        <Stat label="XP" value="1,240" hint="Level 13 · 60 to level 14" className="py-3 pr-3" />
        <Stat label="Streak" value="12 days" hint="Best 19 days" className="border-l border-border py-3 pl-4" />
        <Stat label="Overdue" value="2" tone="destructive" hint="Arrays quiz, project v1" className="border-l border-border py-3 pl-4" />
      </div>

      <div className="mt-5 rounded-lg border border-border bg-card">
        {(
          [
            ['done', 'Maximum average subarray I', '1/6'],
            ['current', 'Sliding window: variable-size windows', '22 min left'],
            ['revise', 'URL shortener, version 1', 'Changes requested'],
            ['todo', 'Permutation in string', 'Medium'],
            ['locked', 'Mock interview: arrays', 'Opens Mon 17 Nov']
          ] as [ItemStatus, string, string][]
        ).map(([status, title, meta]) => (
          <div key={title} className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm first:border-t-0">
            <StatusMark status={status} />
            <span className="flex-1 truncate">{title}</span>
            <span className="tabular whitespace-nowrap text-xs text-muted-foreground">{meta}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Week 6</span>
          <span className="tabular">5 of 8</span>
        </div>
        <Progress value={5} max={8} label="Week 6 progress" />
        <Progress value={87} max={231} label="Pattern Path progress" tone="success" size="md" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unsolved">Unsolved</TabsTrigger>
            <TabsTrigger value="revisit">Revisit</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Search <Kbd>⌘K</Kbd>
        </span>
        <span className="flex items-center gap-2">
          <Avatar name="Ananya Rao" size="sm" />
          <Avatar name="Aarav Sharma" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search problems" aria-label="Search problems" />
        <Skeleton className="h-9" />
      </div>
    </section>
  );
}

export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6 sm:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Style guide</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every theme and colour mode. Dev only.</p>
      </header>
      <AppearanceSettings className="max-w-2xl rounded-lg border border-border bg-card p-6" />
      <div className="grid gap-6 xl:grid-cols-2">
        {THEMES.flatMap((theme) => (['light', 'dark'] as const).map((mode) => <Panel key={`${theme}-${mode}`} theme={theme} mode={mode} />))}
      </div>
    </main>
  );
}
