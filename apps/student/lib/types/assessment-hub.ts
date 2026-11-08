// Shapes for the Assessments page: every assessment-like item (timed exam, practice quiz, project, external test,
// imported report card) normalized into one row model so the page can tab, filter, sort and paginate them together.

export type AssessmentKind = 'formal' | 'practice' | 'project' | 'external_test' | 'report';

/** Where an item sits for the student right now. */
export type AssessmentBucket = 'todo' | 'upcoming' | 'done' | 'closed';

/** Tabs on the page; each groups one or more kinds. */
export type AssessmentTab = 'all' | 'exams' | 'practice' | 'projects' | 'external';

export type AssessmentStatusFilter = 'all' | AssessmentBucket;

export type AssessmentTone = 'primary' | 'success' | 'warning' | 'destructive' | 'muted';

export interface AssessmentHubAction {
  label: string;
  href: string;
  /** Opens a partner platform in a new tab. */
  external?: boolean;
  emphasis: 'primary' | 'warning' | 'secondary';
}

export interface AssessmentHubItem {
  /** Stable React key, unique across kinds. */
  key: string;
  kind: AssessmentKind;
  bucket: AssessmentBucket;
  title: string;
  description: string | null;
  batchId: string | null;
  batchName: string | null;
  /** Program code, provider, or other short source label. */
  source: string | null;
  /** Short facts shown on the meta line, e.g. "45 min", "20 questions". */
  facts: string[];
  status: { label: string; tone: AssessmentTone };
  /** Score text when there is one, e.g. "82%" or "41 / 50 · 82%". */
  score: string | null;
  /** Percentage used for the average-score stat; null when unscored. */
  percentage: number | null;
  /** e.g. "Due 12 Nov, 05:00 pm". */
  dateText: string | null;
  /** Due within the urgency window, or needs the student's action before anything else (resume, revise). */
  urgent: boolean;
  /** Lower sorts first inside the "To do" bucket (0 = in progress / changes requested). */
  priority: number;
  /** Date the bucket's ordering uses (due, opens, completed, or closed date). */
  sortAt: Date | null;
  /** Extra one-line guidance, e.g. sign-in hint for external platforms. */
  note: string | null;
  action: AssessmentHubAction | null;
}

export interface AssessmentHubQuery {
  tab: AssessmentTab;
  status: AssessmentStatusFilter;
  q: string;
  batchId: string | null;
  page: number;
}

export interface AssessmentHubStats {
  todo: number;
  dueSoon: number;
  upcoming: number;
  nextOpensAt: Date | null;
  done: number;
  total: number;
  averagePercentage: number | null;
  scoredCount: number;
}

export interface AssessmentHubView {
  query: AssessmentHubQuery;
  stats: AssessmentHubStats;
  /** Item counts per tab after the search and batch filters (tabs ignore the status filter). */
  tabCounts: Record<AssessmentTab, number>;
  /** Item counts per status inside the current tab. */
  statusCounts: Record<AssessmentStatusFilter, number>;
  items: AssessmentHubItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  /** Batches the student has items in, for the batch filter. */
  batches: { id: string; name: string }[];
}
