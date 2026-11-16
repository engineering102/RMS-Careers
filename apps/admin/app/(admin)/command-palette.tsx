'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  ClipboardList,
  CornerDownLeft,
  FileText,
  Layers,
  LayoutDashboard,
  Loader2,
  Search,
  Upload,
  User,
  UserCog,
  type LucideIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { globalSearchAction } from './search-actions';
import type { GlobalSearchGroup, GlobalSearchResult } from '@/lib/db/queries';

interface PaletteItem {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
}

const GROUP_ICONS: Record<GlobalSearchGroup, LucideIcon> = {
  Students: User,
  Batches: Layers,
  Programs: BookOpen,
  Colleges: Building2,
  Tutors: UserCog,
  Content: FileText
};

function pagesFor(isSuperAdmin: boolean): PaletteItem[] {
  const pages: (PaletteItem & { superAdminOnly?: boolean })[] = [
    { id: 'go-overview', group: 'Go to', title: 'Overview', subtitle: 'What needs attention', href: '/overview', icon: LayoutDashboard },
    { id: 'go-programs', group: 'Go to', title: 'Programs', subtitle: 'Programs and enrollment links', href: '/programs', icon: BookOpen },
    { id: 'go-colleges', group: 'Go to', title: 'Colleges', subtitle: 'Partner institutions', href: '/colleges', icon: Building2, superAdminOnly: true },
    { id: 'go-batches', group: 'Go to', title: 'Batches', subtitle: 'Cohorts, curriculum, projects, analytics', href: '/batches', icon: Layers },
    { id: 'go-tutors', group: 'Go to', title: 'Tutors', subtitle: 'Invite and manage tutors', href: '/tutors', icon: UserCog },
    { id: 'go-enrollments', group: 'Go to', title: 'Enrollments', subtitle: 'All student registrations', href: '/enrollments', icon: ClipboardList },
    { id: 'go-pending', group: 'Go to', title: 'Pending enrollments', subtitle: 'Students waiting for confirmation', href: '/enrollments?status=pending', icon: ClipboardList },
    { id: 'go-import', group: 'Go to', title: 'Import students', subtitle: 'CSV or Excel bulk import', href: '/enrollments/import', icon: Upload },
    { id: 'go-content', group: 'Go to', title: 'Content Library', subtitle: 'Lectures, quizzes, projects, DSA sheets', href: '/content', icon: FileText }
  ];
  return pages.filter((p) => isSuperAdmin || !p.superAdminOnly);
}

/**
 * Header search and jump box. Opens with Ctrl+K (Cmd+K on macOS) or "/" outside a text field.
 * Typing filters the page list at once and, from two characters, searches students, batches,
 * programs, tutors and content on the server.
 */
export function CommandPalette({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);
  const pages = React.useMemo(() => pagesFor(isSuperAdmin), [isSuperAdmin]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const el = e.target as HTMLElement | null;
        const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const query = term.trim();

  // Debounced server search; a stale response never overwrites a newer one.
  React.useEffect(() => {
    if (!open || query.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await globalSearchAction(query).catch(() => null);
      if (cancelled) return;
      setSearching(false);
      if (res?.success) {
        setResults(res.data);
        setError(null);
      } else {
        setResults([]);
        setError(res?.error ?? 'Search failed. Please try again.');
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const items = React.useMemo<PaletteItem[]>(() => {
    const needle = query.toLowerCase();
    const matchingPages = needle
      ? pages.filter((p) => `${p.title} ${p.subtitle ?? ''}`.toLowerCase().includes(needle))
      : pages;
    const found = results.map<PaletteItem>((r) => ({ ...r, icon: GROUP_ICONS[r.group] }));
    return [...found, ...matchingPages];
  }, [pages, query, results]);

  React.useEffect(() => setActiveIndex(0), [items.length, query]);

  React.useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTerm('');
      setResults([]);
    }
  };

  const go = (item: PaletteItem) => {
    handleOpenChange(false);
    router.push(item.href);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) go(item);
    }
  };

  let lastGroup = '';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative ml-auto flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-[200px] md:grow-0 lg:w-[336px]"
        aria-label="Search students, batches and content, or jump to a page"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search or jump to…</span>
        <kbd className="ml-auto hidden shrink-0 whitespace-nowrap rounded border bg-muted px-1.5 font-mono text-[11px] sm:inline-block">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 data-[state=closed]:slide-out-to-top-[10%] data-[state=open]:slide-in-from-top-[10%]">
          <DialogTitle className="sr-only">Search and jump</DialogTitle>
          <DialogDescription className="sr-only">
            Type to find a student, batch, program, tutor or content item, or to jump to a page. Use the arrow keys and
            Enter to open a result.
          </DialogDescription>
          <div className="flex items-center gap-2 border-b px-3 pr-10">
            {searching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={onInputKeyDown}
              maxLength={80}
              placeholder="Student name, email, roll number, batch, content…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-activedescendant={items[activeIndex] ? `palette-${items[activeIndex].id}` : undefined}
              aria-label="Search"
            />
          </div>

          <div ref={listRef} id="command-palette-list" role="listbox" aria-label="Results" className="max-h-[55vh] overflow-y-auto p-2">
            {error ? <p className="px-2 py-3 text-sm text-destructive">{error}</p> : null}
            {!error && items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {searching ? 'Searching…' : `Nothing matches "${query}".`}
              </p>
            ) : null}
            {items.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const active = index === activeIndex;
              return (
                <React.Fragment key={item.id}>
                  {showGroup ? (
                    <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    id={`palette-${item.id}`}
                    role="option"
                    aria-selected={active}
                    data-active={active}
                    tabIndex={-1}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm',
                      active ? 'bg-accent text-accent-foreground' : 'text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      {item.subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      ) : null}
                    </span>
                    {active ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-3 border-t bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              <kbd className="rounded border bg-background px-1 font-mono">↑</kbd>{' '}
              <kbd className="rounded border bg-background px-1 font-mono">↓</kbd> to move
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 font-mono">Enter</kbd> to open
            </span>
            <span className="ml-auto">
              <kbd className="rounded border bg-background px-1 font-mono">Esc</kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
