// Builds the Assessments page view: normalizes every assessment source into one row model, then filters, sorts and
// paginates it. Pure (no DB, no server-only) so it is unit-testable; `now` is injected.

import { formatDate } from '@/lib/format/datetime';
import type { ExternalAssessmentRecord, ExternalTestSummary } from '@/lib/types/external-assessments';
import type { FormalAssessmentSummary, PracticeQuizSummary } from '@/lib/types/assessments';
import type { ProjectAssignmentCardData } from '@/lib/types/projects';
import type {
  AssessmentBucket,
  AssessmentHubItem,
  AssessmentHubQuery,
  AssessmentHubStats,
  AssessmentHubView,
  AssessmentKind,
  AssessmentStatusFilter,
  AssessmentTab
} from '@/lib/types/assessment-hub';

export const ASSESSMENT_PAGE_SIZE = 10;

/** Items due inside this window are flagged as urgent. */
const URGENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export const ASSESSMENT_TABS: readonly AssessmentTab[] = ['all', 'exams', 'practice', 'projects', 'external'];
export const ASSESSMENT_STATUSES: readonly AssessmentStatusFilter[] = ['all', 'todo', 'upcoming', 'done', 'closed'];

const TAB_KINDS: Record<Exclude<AssessmentTab, 'all'>, readonly AssessmentKind[]> = {
  exams: ['formal'],
  practice: ['practice'],
  projects: ['project'],
  external: ['external_test', 'report']
};

const BUCKET_RANK: Record<AssessmentBucket, number> = { todo: 0, upcoming: 1, done: 2, closed: 3 };

export interface AssessmentSources {
  formal: FormalAssessmentSummary[];
  practice: PracticeQuizSummary[];
  projects: ProjectAssignmentCardData[];
  externalTests: ExternalTestSummary[];
  reports: ExternalAssessmentRecord[];
}

const dateTime = (d: Date) =>
  formatDate(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dateOnly = (d: Date) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** 1st, 2nd, 3rd, 11th, 91st… */
export function ordinal(n: number): string {
  const rounded = Math.round(n);
  const tens = rounded % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[rounded % 10] ?? 'th';
  return `${rounded}${suffix}`;
}

function isDueSoon(dueAt: Date | null, now: Date): boolean {
  if (!dueAt) return false;
  const left = dueAt.getTime() - now.getTime();
  return left >= 0 && left <= URGENT_WINDOW_MS;
}

function batchHref(path: string, batchId: string | null | undefined): string {
  return batchId ? `${path}?batchId=${encodeURIComponent(batchId)}` : path;
}

function fromFormal(a: FormalAssessmentSummary, now: Date): AssessmentHubItem {
  const href = batchHref(`/assessments/${encodeURIComponent(a.id)}`, a.batchId);
  const base = {
    key: `formal:${a.id}:${a.batchId}`,
    kind: 'formal' as const,
    title: a.title,
    description: a.description,
    batchId: a.batchId,
    batchName: a.batchName,
    source: a.programCode || a.programName || null,
    facts: [
      `${a.timeLimitMinutes} min`,
      plural(a.questionCount, 'question'),
      `Pass ${a.passingScorePercent}%`
    ],
    note: null,
    score: null,
    percentage: null,
    priority: 1
  };

  switch (a.status) {
    case 'in_progress':
      return {
        ...base,
        bucket: 'todo',
        status: { label: 'In progress', tone: 'warning' },
        dateText: a.dueAt ? `Due ${dateTime(a.dueAt)}` : null,
        urgent: true,
        priority: 0,
        sortAt: a.dueAt,
        note: 'Your timer is running. Resume before it runs out.',
        action: { label: 'Resume', href, emphasis: 'warning' }
      };
    case 'available':
      return {
        ...base,
        bucket: 'todo',
        status: { label: 'Open', tone: 'primary' },
        dateText: a.dueAt ? `Due ${dateTime(a.dueAt)}` : null,
        urgent: isDueSoon(a.dueAt, now),
        sortAt: a.dueAt,
        action: { label: 'Start exam', href, emphasis: 'primary' }
      };
    case 'upcoming':
      return {
        ...base,
        bucket: 'upcoming',
        status: { label: 'Upcoming', tone: 'muted' },
        dateText: a.availableFrom ? `Opens ${dateTime(a.availableFrom)}` : null,
        urgent: false,
        sortAt: a.availableFrom,
        action: null
      };
    case 'submitted':
    case 'auto_submitted': {
      const attempt = a.attempt ?? null;
      const passed = Boolean(attempt?.isPassed);
      const submittedAt = attempt?.submittedAt ?? null;
      return {
        ...base,
        bucket: 'done',
        status: passed ? { label: 'Passed', tone: 'success' } : { label: 'Submitted', tone: 'muted' },
        score: attempt ? `${attempt.percentage}%` : null,
        percentage: attempt ? attempt.percentage : null,
        dateText: submittedAt ? `Submitted ${dateOnly(submittedAt)}` : null,
        urgent: false,
        sortAt: submittedAt,
        action: { label: 'View result', href, emphasis: 'secondary' }
      };
    }
    case 'closed':
    default:
      return {
        ...base,
        bucket: 'closed',
        status: { label: 'Missed', tone: 'destructive' },
        dateText: a.dueAt ? `Closed ${dateOnly(a.dueAt)}` : null,
        urgent: false,
        sortAt: a.dueAt,
        action: null
      };
  }
}

function fromPractice(q: PracticeQuizSummary): AssessmentHubItem {
  const href = `/assessments/${encodeURIComponent(q.id)}`;
  const attempted = q.attemptCount > 0;
  const base = {
    key: `practice:${q.id}`,
    kind: 'practice' as const,
    title: q.title,
    description: q.description,
    batchId: null,
    batchName: null,
    source: q.programCode || q.programName || null,
    facts: [
      plural(q.questionCount, 'question'),
      `Pass ${q.passingScorePercent}%`,
      ...(attempted ? [plural(q.attemptCount, 'attempt')] : [])
    ],
    note: null,
    urgent: false,
    priority: 1,
    // Practice has no deadline: in "To do" it sorts after dated items; in "Done" by most recent attempt.
    sortAt: q.isPassed ? q.lastAttemptAt : null,
    dateText: q.lastAttemptAt ? `Last attempt ${dateOnly(q.lastAttemptAt)}` : null,
    percentage: attempted ? q.bestPercentage : null,
    score: attempted && q.bestPercentage !== null ? `Best ${q.bestPercentage}%` : null
  };

  if (q.isPassed) {
    return {
      ...base,
      bucket: 'done',
      status: { label: 'Passed', tone: 'success' },
      action: { label: 'Practice again', href, emphasis: 'secondary' }
    };
  }
  if (attempted) {
    return {
      ...base,
      bucket: 'todo',
      status: { label: 'Not passed yet', tone: 'warning' },
      action: { label: 'Try again', href, emphasis: 'warning' }
    };
  }
  return {
    ...base,
    bucket: 'todo',
    status: { label: 'Not started', tone: 'muted' },
    action: { label: 'Start', href, emphasis: 'primary' }
  };
}

function fromProject(p: ProjectAssignmentCardData, now: Date): AssessmentHubItem {
  const href = batchHref(`/content/${encodeURIComponent(p.contentItemId)}`, p.batchId);
  const sub = p.submission;
  const base = {
    key: `project:${p.contentItemId}:${p.batchId}`,
    kind: 'project' as const,
    title: p.title,
    description: p.description,
    batchId: p.batchId,
    batchName: p.batchName,
    source: null,
    facts: [`${p.maxScore} pts`],
    note: null,
    score: null,
    percentage: null,
    priority: 1
  };
  const due = p.dueAt ? `Due ${dateTime(p.dueAt)}` : null;

  switch (sub?.status) {
    case 'resubmission_requested':
      return {
        ...base,
        bucket: 'todo',
        status: { label: 'Changes requested', tone: 'warning' },
        dateText: due,
        urgent: true,
        priority: 0,
        sortAt: p.dueAt,
        action: { label: 'Revise', href, emphasis: 'warning' }
      };
    case 'submitted':
    case 'under_review':
      return {
        ...base,
        bucket: 'done',
        status: { label: sub.status === 'submitted' ? 'Submitted' : 'Under review', tone: 'primary' },
        dateText: `Submitted ${dateOnly(sub.submittedAt)}`,
        urgent: false,
        sortAt: sub.submittedAt,
        action: { label: 'Open workspace', href, emphasis: 'secondary' }
      };
    case 'approved': {
      const pct = sub.score !== null && p.maxScore > 0 ? Math.round((sub.score / p.maxScore) * 100) : null;
      const at = sub.reviewedAt ?? sub.submittedAt;
      return {
        ...base,
        bucket: 'done',
        status: { label: 'Approved', tone: 'success' },
        score: sub.score !== null ? `${sub.score} / ${p.maxScore}` : null,
        percentage: pct,
        dateText: `Reviewed ${dateOnly(at)}`,
        urgent: false,
        sortAt: at,
        action: { label: 'Open workspace', href, emphasis: 'secondary' }
      };
    }
    default: {
      // Late submissions stay possible, so an overdue project is still "to do", flagged red.
      const overdue = Boolean(p.dueAt && p.dueAt.getTime() < now.getTime());
      return {
        ...base,
        bucket: 'todo',
        status: overdue ? { label: 'Overdue', tone: 'destructive' } : { label: 'Not submitted', tone: 'muted' },
        dateText: due,
        urgent: overdue || isDueSoon(p.dueAt, now),
        sortAt: p.dueAt,
        action: { label: 'Submit project', href, emphasis: 'primary' }
      };
    }
  }
}

function fromExternalTest(t: ExternalTestSummary, report: ExternalAssessmentRecord | undefined, now: Date): AssessmentHubItem {
  const base = {
    key: `external:${t.placementId}`,
    kind: 'external_test' as const,
    title: t.title,
    description: t.description,
    batchId: t.batchId,
    batchName: t.batchName,
    source: t.provider,
    facts: [
      ...(t.durationMinutes ? [`${t.durationMinutes} min`] : []),
      ...(report?.percentile != null ? [`${ordinal(report.percentile)} percentile`] : [])
    ],
    note: null,
    score: null,
    percentage: null,
    priority: 1
  };

  if (t.result) {
    return {
      ...base,
      bucket: 'done',
      status: { label: 'Scored', tone: 'success' },
      score: `${t.result.obtainedScore} / ${t.result.maxScore} · ${t.result.percentage}%`,
      percentage: t.result.percentage,
      dateText: `Scored ${dateOnly(t.result.importedAt)}`,
      urgent: false,
      sortAt: t.result.importedAt,
      action: null
    };
  }
  if (t.windowState === 'open') {
    return {
      ...base,
      bucket: 'todo',
      status: { label: 'Open now', tone: 'primary' },
      dateText: t.dueAt ? `Closes ${dateTime(t.dueAt)}` : null,
      urgent: isDueSoon(t.dueAt, now),
      sortAt: t.dueAt,
      note: t.url
        ? 'Sign in with your RMS Careers email so your score is matched to you.'
        : 'The test link has not been added yet.',
      action: t.url ? { label: `Start on ${t.provider}`, href: t.url, external: true, emphasis: 'primary' } : null
    };
  }
  if (t.windowState === 'upcoming') {
    return {
      ...base,
      bucket: 'upcoming',
      status: { label: 'Upcoming', tone: 'muted' },
      dateText: t.availableFrom ? `Opens ${dateTime(t.availableFrom)}` : null,
      urgent: false,
      sortAt: t.availableFrom,
      action: null
    };
  }
  return {
    ...base,
    bucket: 'closed',
    status: { label: 'Awaiting result', tone: 'muted' },
    dateText: t.dueAt ? `Closed ${dateOnly(t.dueAt)}` : null,
    urgent: false,
    sortAt: t.dueAt,
    note: 'Your score appears here once your institute imports it.',
    action: null
  };
}

const TIER_LABEL: Record<ExternalAssessmentRecord['performanceTier'], { label: string; tone: AssessmentHubItem['status']['tone'] }> = {
  elite: { label: 'Elite', tone: 'success' },
  advanced: { label: 'Advanced', tone: 'primary' },
  proficient: { label: 'Proficient', tone: 'warning' },
  developing: { label: 'Developing', tone: 'muted' }
};

function fromReport(r: ExternalAssessmentRecord): AssessmentHubItem {
  return {
    key: `report:${r.id}`,
    kind: 'report',
    bucket: 'done',
    title: r.assessmentName,
    description: null,
    batchId: r.batchId,
    batchName: r.batchName,
    source: r.provider,
    facts: [r.assessmentCode, ...(r.percentile !== null ? [`${ordinal(r.percentile)} percentile`] : [])],
    status: TIER_LABEL[r.performanceTier] ?? TIER_LABEL.developing,
    score: `${r.obtainedScore} / ${r.maxScore} · ${r.percentage}%`,
    percentage: r.percentage,
    dateText: `Imported ${dateOnly(r.importedAt)}`,
    urgent: false,
    priority: 1,
    sortAt: r.importedAt,
    note: null,
    action: null
  };
}

const reportKey = (batchId: string, code: string) => `${batchId}::${code.toLowerCase()}`;

/**
 * Normalizes every source into rows. A report card imported for an external test placed in the same batch is
 * folded into that test's row (it is the same result), so it is not listed twice.
 */
export function buildAssessmentItems(sources: AssessmentSources, now: Date): AssessmentHubItem[] {
  const reportsByKey = new Map(sources.reports.map((r) => [reportKey(r.batchId, r.assessmentCode), r]));
  const consumedReports = new Set<number>();

  const externalItems = sources.externalTests.map((t) => {
    const report = t.codeKey ? reportsByKey.get(reportKey(t.batchId, t.codeKey)) : undefined;
    if (report && t.result) consumedReports.add(report.id);
    return fromExternalTest(t, t.result ? report : undefined, now);
  });

  return [
    ...sources.formal.map((a) => fromFormal(a, now)),
    ...sources.practice.map(fromPractice),
    ...sources.projects.map((p) => fromProject(p, now)),
    ...externalItems,
    ...sources.reports.filter((r) => !consumedReports.has(r.id)).map(fromReport)
  ];
}

function compareNullableDates(a: Date | null, b: Date | null, direction: 'asc' | 'desc'): number {
  if (a && b) return direction === 'asc' ? a.getTime() - b.getTime() : b.getTime() - a.getTime();
  if (a) return -1; // dated items before undated ones in both directions
  if (b) return 1;
  return 0;
}

/** To do first (most pressing first), then upcoming (soonest first), then done and closed (most recent first). */
export function compareAssessmentItems(a: AssessmentHubItem, b: AssessmentHubItem): number {
  const rank = BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket];
  if (rank !== 0) return rank;

  if (a.bucket === 'todo') {
    if (a.priority !== b.priority) return a.priority - b.priority;
  }
  const direction = a.bucket === 'todo' || a.bucket === 'upcoming' ? 'asc' : 'desc';
  return compareNullableDates(a.sortAt, b.sortAt, direction) || a.title.localeCompare(b.title);
}

function pickOne<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Reads `?type=&status=&q=&batchId=&page=`; unknown values fall back to defaults. */
export function parseAssessmentQuery(params: Record<string, string | string[] | undefined>): AssessmentHubQuery {
  const first = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const page = Number.parseInt(first('page') ?? '1', 10);
  return {
    tab: pickOne(first('type'), ASSESSMENT_TABS, 'all'),
    status: pickOne(first('status'), ASSESSMENT_STATUSES, 'all'),
    q: (first('q') ?? '').trim().slice(0, 100),
    batchId: first('batchId')?.trim() || null,
    page: Number.isFinite(page) && page > 0 ? page : 1
  };
}

/** Builds an `/assessments` URL for the given query, dropping defaults. */
export function assessmentHref(query: AssessmentHubQuery, patch: Partial<AssessmentHubQuery> = {}): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.tab !== 'all') params.set('type', next.tab);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.batchId) params.set('batchId', next.batchId);
  if (next.page > 1) params.set('page', String(next.page));
  const qs = params.toString();
  return qs ? `/assessments?${qs}` : '/assessments';
}

function inTab(item: AssessmentHubItem, tab: AssessmentTab): boolean {
  return tab === 'all' || TAB_KINDS[tab].includes(item.kind);
}

function matchesSearch(item: AssessmentHubItem, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [item.title, item.source, item.batchName].some((v) => v?.toLowerCase().includes(needle));
}

function computeStats(items: AssessmentHubItem[], now: Date): AssessmentHubStats {
  const todo = items.filter((i) => i.bucket === 'todo');
  const upcoming = items.filter((i) => i.bucket === 'upcoming');
  // Every scored item counts once: exam attempts, best practice scores, project reviews and imported results.
  const scored = items.filter((i) => i.percentage !== null);
  const nextOpensAt =
    upcoming
      .map((i) => i.sortAt)
      .filter((d): d is Date => d !== null && d.getTime() >= now.getTime())
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  return {
    todo: todo.length,
    dueSoon: todo.filter((i) => i.urgent).length,
    upcoming: upcoming.length,
    nextOpensAt,
    done: items.filter((i) => i.bucket === 'done').length,
    total: items.length,
    averagePercentage:
      scored.length > 0
        ? Math.round(scored.reduce((sum, i) => sum + (i.percentage ?? 0), 0) / scored.length)
        : null,
    scoredCount: scored.length
  };
}

/**
 * Applies the query to all rows. The batch filter scopes everything on the page (stats included); search scopes the
 * tabs and the list; the tab scopes the status counts; the status scopes the list. Practice quizzes are
 * program-wide (no batch) and stay visible under any batch filter.
 */
export function buildAssessmentView(
  allItems: AssessmentHubItem[],
  query: AssessmentHubQuery,
  now: Date = new Date(),
  pageSize = ASSESSMENT_PAGE_SIZE
): AssessmentHubView {
  const batchMap = new Map<string, string>();
  for (const item of allItems) {
    if (item.batchId && item.batchName) batchMap.set(item.batchId, item.batchName);
  }
  const batches = Array.from(batchMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  // A stale or foreign batchId is ignored rather than producing an empty page.
  const batchId = query.batchId && batchMap.has(query.batchId) ? query.batchId : null;

  const inBatch = allItems.filter((i) => !batchId || i.batchId === null || i.batchId === batchId);
  const searched = inBatch.filter((i) => matchesSearch(i, query.q));

  const tabCounts = Object.fromEntries(
    ASSESSMENT_TABS.map((tab) => [tab, searched.filter((i) => inTab(i, tab)).length])
  ) as Record<AssessmentTab, number>;

  const tabbed = searched.filter((i) => inTab(i, query.tab));
  const statusCounts = Object.fromEntries(
    ASSESSMENT_STATUSES.map((s) => [s, s === 'all' ? tabbed.length : tabbed.filter((i) => i.bucket === s).length])
  ) as Record<AssessmentStatusFilter, number>;

  const filtered = tabbed
    .filter((i) => query.status === 'all' || i.bucket === query.status)
    .sort(compareAssessmentItems);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(query.page, totalPages);

  return {
    query: { ...query, batchId, page },
    stats: computeStats(inBatch, now),
    tabCounts,
    statusCounts,
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    totalCount: filtered.length,
    page,
    totalPages,
    pageSize,
    batches
  };
}
