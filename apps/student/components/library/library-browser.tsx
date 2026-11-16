'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, ListFilter, Search, SearchX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getLibraryCategory, type LibraryCategory } from '@/lib/data/library-categories';
import {
  countByFormat,
  formatCount,
  getLibrarySubject,
  groupByFormat,
  libraryViewHref,
  parseLibraryView,
  scopeItems,
  searchItems,
  subjectShelves,
  topicsOf,
  type FormatCount,
  type LibrarySubject,
  type LibraryView,
  type SubjectShelf
} from '@/lib/library/browse';
import type { LibraryCatalogItem } from '@/lib/types/library';
import { FormatItems } from './item-cards';
import { FORMAT_ICONS, subjectToneStyle, subjectVisual, TONE_TILE } from './library-visuals';

/** Content cards shown before "Show more". */
const PAGE_SIZE = 24;

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type Navigate = (view: Partial<LibraryView>) => void;

/**
 * A link that changes the Library view in place. The whole catalog is already in the browser, so the view is
 * switched by updating the URL (history.pushState) rather than asking the server for a new page: Back, Forward,
 * reload and shared links all work, and a plain click costs no request. Modified clicks fall through to the href.
 */
function ViewLink({
  view,
  navigate,
  className,
  children,
  ...rest
}: {
  view: Partial<LibraryView>;
  navigate: Navigate;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <a
      {...rest}
      href={libraryViewHref(view)}
      className={className}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        navigate(view);
      }}
    >
      {children}
    </a>
  );
}

interface LibraryBrowserProps {
  items: LibraryCatalogItem[];
  /** Codes of the programmes the catalog was drawn from, for the header. */
  programCodes: string[];
}

/**
 * The Library, three levels deep: subjects > the formats inside a subject > the content of one format.
 * Search works at every level, over whatever that level contains.
 */
export function LibraryBrowser({ items, programCodes }: LibraryBrowserProps) {
  const searchParams = useSearchParams();
  const view = React.useMemo(() => parseLibraryView(searchParams), [searchParams]);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // The search box is typed into faster than the URL should churn, so it keeps its own text.
  const [searchText, setSearchText] = React.useState(view.query);
  // Follow the URL (Back, Forward, a card link) without eating a space the student has just typed.
  React.useEffect(() => {
    setSearchText((text) => (text.trim() === view.query ? text : view.query));
  }, [view.query]);

  const navigate: Navigate = (next) => {
    window.history.pushState(null, '', libraryViewHref(next));
    window.scrollTo({ top: 0 });
    // Tell keyboard and screen-reader users the view changed.
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  // Search and the topic filter refine the level that is open; they replace the history entry so Back leaves
  // the level in one step.
  const refine = (patch: Partial<LibraryView>) => {
    window.history.replaceState(null, '', libraryViewHref({ ...view, ...patch }));
  };
  const onSearch = (text: string) => {
    setSearchText(text);
    refine({ query: text });
  };

  const subject = getLibrarySubject(view.subject);
  const category = getLibraryCategory(view.type);
  const level: 'subjects' | 'formats' | 'content' = category ? 'content' : subject ? 'formats' : 'subjects';

  const scoped = React.useMemo(() => scopeItems(items, view), [items, view]);
  const query = searchText.trim();
  const topics = React.useMemo(() => (level === 'content' ? topicsOf(scoped) : []), [level, scoped]);
  // A topic left in the URL from another shelf must not silently empty this one.
  const topic = view.topic && topics.includes(view.topic) ? view.topic : null;
  const results = React.useMemo(
    () => searchItems(topic ? scoped.filter((item) => item.topic === topic) : scoped, query),
    [scoped, topic, query]
  );

  const title = category?.label ?? subject?.label ?? 'Library';
  const description =
    level === 'subjects'
      ? 'Browse your library by subject. Open a subject to find its recorded lectures, notes, practice sheets and quizzes.'
      : level === 'formats'
        ? subject!.description
        : category!.description;
  const searchLabel =
    level === 'subjects' ? 'Search subjects, topics or content' : level === 'formats' ? 'Search in this subject' : `Search ${title.toLowerCase()}`;

  const searchBox = (
    <div className={cn('relative', level === 'subjects' ? 'w-full' : 'w-full sm:flex-1 lg:w-72 lg:flex-none')}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={searchText}
        onChange={(event) => onSearch(event.target.value)}
        aria-label={searchLabel}
        placeholder={`${searchLabel}…`}
        className={cn(
          'w-full rounded-lg border border-input bg-card pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring [&::-webkit-search-cancel-button]:hidden',
          level === 'subjects' ? 'h-12 text-[15px]' : 'h-10 text-sm'
        )}
      />
      {searchText && (
        <button
          type="button"
          onClick={() => onSearch('')}
          aria-label="Clear search"
          className={cn('absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground', FOCUS)}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const EyebrowIcon = category ? FORMAT_ICONS[category.type] : null;

  return (
    <div className="space-y-8" style={subject ? subjectToneStyle(subject.slug) : undefined}>
      <header className="space-y-5">
        {level !== 'subjects' && (
          <Breadcrumb subject={subject} category={category} navigate={navigate} />
        )}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {level === 'content' && EyebrowIcon && (
              <p className="mb-2 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <EyebrowIcon
                  className={cn('h-4 w-4', subject && 'text-[hsl(var(--tone)_46%)]')}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {subject?.label ?? 'All subjects'}
              </p>
            )}
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground outline-none md:text-[2.25rem]"
            >
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {level === 'subjects' ? (
            programCodes.length > 0 && (
              <p className="shrink-0 self-start rounded-lg border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground lg:self-auto">
                Enrolled {programCodes.length === 1 ? 'programme' : 'programmes'}:{' '}
                <span className="font-semibold text-foreground">{programCodes.join(', ')}</span>
              </p>
            )
          ) : (
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              {searchBox}
              {topics.length > 0 && (
                <div className="relative">
                  <ListFilter
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <select
                    aria-label="Filter by topic"
                    value={topic ?? ''}
                    onChange={(event) => refine({ topic: event.target.value || null })}
                    className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pl-9 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:max-w-[14rem]"
                  >
                    <option value="">All topics</option>
                    {topics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {level === 'subjects' && searchBox}
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={FORMAT_ICONS.resource}
          title="Nothing in your library yet"
          description="Lectures, notes and practice appear here as your programme publishes them."
        />
      ) : level === 'content' ? (
        <ContentList
          // A different shelf, topic or search starts from the first page again.
          key={`${view.subject}/${view.type}/${topic}/${query}`}
          category={category!}
          items={results}
          total={scoped.length}
          filtered={Boolean(query || topic)}
          onReset={() => {
            setSearchText('');
            refine({ query: '', topic: null });
          }}
          onBack={() => navigate({ subject: view.subject })}
        />
      ) : query ? (
        <SearchResults
          results={results}
          query={query}
          scopeTitle={subject?.label ?? null}
          onClear={() => onSearch('')}
        />
      ) : level === 'subjects' ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {subjectShelves(items).map((shelf) => (
            <li key={shelf.subject.slug} className="flex">
              <SubjectCard shelf={shelf} navigate={navigate} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {countByFormat(scoped).map((format) => (
            <li key={format.category.type} className="flex">
              <FormatCard format={format} subject={subject!} navigate={navigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Breadcrumb({
  subject,
  category,
  navigate
}: {
  subject: LibrarySubject | null;
  category: LibraryCategory | null;
  navigate: Navigate;
}) {
  const link = cn('rounded px-1 py-0.5 hover:text-foreground', FOCUS);
  const current = 'rounded-md bg-muted px-2 py-0.5 font-medium text-foreground';
  const separator = <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <ViewLink view={{}} navigate={navigate} className={link}>
            Library
          </ViewLink>
        </li>
        {subject && (
          <li className="flex items-center gap-1.5">
            {separator}
            {category ? (
              <ViewLink view={{ subject: subject.slug }} navigate={navigate} className={link}>
                {subject.label}
              </ViewLink>
            ) : (
              <span aria-current="page" className={current}>
                {subject.label}
              </span>
            )}
          </li>
        )}
        {category && (
          <li className="flex items-center gap-1.5">
            {separator}
            <span aria-current="page" className={current}>
              {category.label}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}

/** Level 1. A subject: its icon and tone, what it covers, and what is inside. */
function SubjectCard({ shelf, navigate }: { shelf: SubjectShelf; navigate: Navigate }) {
  const { icon: Icon } = subjectVisual(shelf.subject.slug);
  const shown = shelf.formats.slice(0, 2);
  const more = shelf.formats.length - shown.length;
  return (
    <ViewLink
      view={{ subject: shelf.subject.slug }}
      navigate={navigate}
      style={subjectToneStyle(shelf.subject.slug)}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card p-6 transition-[border-color,transform] duration-150 hover:border-[hsl(var(--tone)_50%/0.55)] active:scale-[0.99] motion-reduce:transform-none',
        FOCUS
      )}
    >
      {/* A soft arc of the subject's tone in the corner; it swells a little on hover. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[hsl(var(--tone)_50%/0.09)] transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transform-none"
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-lg border border-[hsl(var(--tone)_50%/0.28)]',
          TONE_TILE
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>

      <h2 className="relative mt-5 text-xl font-semibold leading-snug tracking-tight text-foreground">
        {shelf.subject.label}
      </h2>
      <p className="relative mt-2 line-clamp-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">
        {shelf.subject.description}
      </p>

      <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-border pt-4 text-sm">
        <span className="min-w-0 truncate text-muted-foreground">
          {shown.map((f, i) => (
            <React.Fragment key={f.category.type}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <span className="tabular">{formatCount(f.category, f.count)}</span>
            </React.Fragment>
          ))}
          {more > 0 && <span> · +{more} more</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
          Browse
          <ChevronRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </span>
      </div>
    </ViewLink>
  );
}

/** Level 2. A format inside a subject: a big count up top and a footer band saying what is in it. */
function FormatCard({
  format,
  subject,
  navigate
}: {
  format: FormatCount;
  subject: LibrarySubject;
  navigate: Navigate;
}) {
  const { category, count, topicCount } = format;
  const Icon = FORMAT_ICONS[category.type];
  const isEmpty = count === 0;

  const body = (
    <>
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            isEmpty ? 'bg-muted text-muted-foreground' : TONE_TILE
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="tabular font-display text-4xl font-semibold leading-none tracking-tight text-foreground">
          {count}
        </span>
      </div>
      <div className="flex-1 p-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{category.label}</h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{category.description}</p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-3 text-sm">
        <span className="tabular truncate text-muted-foreground">
          {isEmpty
            ? 'Nothing here yet'
            : `${formatCount(category, count)}${topicCount > 0 ? ` · ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}` : ''}`}
        </span>
        {!isEmpty && (
          <span className="flex shrink-0 items-center gap-1 font-medium text-foreground">
            Explore
            <ChevronRight
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </span>
        )}
      </div>
    </>
  );

  const base = 'group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card';
  if (isEmpty) {
    return <div className={cn(base, 'opacity-55')}>{body}</div>;
  }
  return (
    <ViewLink
      view={{ subject: subject.slug, type: category.type }}
      navigate={navigate}
      aria-label={`${category.label}: ${formatCount(category, count)}`}
      className={cn(
        base,
        'transition-[border-color,transform] duration-150 hover:border-border-strong active:scale-[0.99] motion-reduce:transform-none',
        FOCUS
      )}
    >
      {body}
    </ViewLink>
  );
}

/** Level 3. The content of one format, in that format's card style. */
function ContentList({
  category,
  items,
  total,
  filtered,
  onReset,
  onBack
}: {
  category: LibraryCategory;
  items: LibraryCatalogItem[];
  total: number;
  filtered: boolean;
  onReset: () => void;
  onBack: () => void;
}) {
  const [shown, setShown] = React.useState(PAGE_SIZE);

  if (items.length === 0) {
    return filtered ? (
      <EmptyState
        icon={SearchX}
        title="No matches"
        description={`No ${category.noun[1]} match your search or topic. Try fewer words or another topic.`}
        action={
          <Button variant="outline" size="sm" onClick={onReset}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={FORMAT_ICONS[category.type]}
        title={`No ${category.noun[1]} here yet`}
        description="There is nothing published here for your programmes at the moment."
        action={
          <Button variant="outline" size="sm" onClick={onBack}>
            Go back
          </Button>
        }
      />
    );
  }

  const visible = items.slice(0, shown);
  return (
    <div className="space-y-5 border-t border-border pt-6">
      <p className="text-sm text-muted-foreground" role="status">
        {filtered ? (
          <>
            <span className="tabular font-medium text-foreground">{items.length}</span> of {formatCount(category, total)}
          </>
        ) : (
          <span className="tabular">{formatCount(category, total)}</span>
        )}
      </p>
      <FormatItems type={category.type} items={visible} />
      {items.length > shown && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE_SIZE)}>
            Show more ({items.length - shown} left)
          </Button>
        </div>
      )}
    </div>
  );
}

/** Search above the content level: matches from every format, one group per format. */
function SearchResults({
  results,
  query,
  scopeTitle,
  onClear
}: {
  results: LibraryCatalogItem[];
  query: string;
  scopeTitle: string | null;
  onClear: () => void;
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No matches for "${query}"`}
        description={
          scopeTitle
            ? `Nothing in ${scopeTitle} matches. Try fewer words, or search the whole library from its first page.`
            : 'Try fewer or different words: search looks at titles, descriptions, topics and subjects.'
        }
        action={
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear search
          </Button>
        }
      />
    );
  }
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground" role="status">
        <span className="tabular font-medium text-foreground">{results.length}</span>{' '}
        {results.length === 1 ? 'match' : 'matches'} for "{query}"{scopeTitle ? ` in ${scopeTitle}` : ''}
      </p>
      {groupByFormat(results).map(({ category, items }) => (
        <section key={category.type} aria-labelledby={`library-results-${category.type}`} className="space-y-4">
          <div className="flex items-baseline gap-2 border-b border-border pb-2">
            <h2 id={`library-results-${category.type}`} className="text-base font-semibold tracking-tight text-foreground">
              {category.label}
            </h2>
            <span className="tabular text-sm text-muted-foreground">{items.length}</span>
          </div>
          <FormatItems type={category.type} items={items.slice(0, PAGE_SIZE)} />
        </section>
      ))}
    </div>
  );
}
