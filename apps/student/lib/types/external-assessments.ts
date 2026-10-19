export type PerformanceTier = 'elite' | 'advanced' | 'proficient' | 'developing';

export interface ExternalAssessmentRecord {
  id: number;
  assessmentCode: string;
  assessmentName: string;
  provider: string;
  batchId: string;
  batchName: string;
  maxScore: number;
  obtainedScore: number;
  percentage: number;
  percentile: number | null;
  importedAt: Date;
  performanceTier: PerformanceTier;
}

/** An `external_test` curriculum item as the student sees it on the Assessments page. */
export interface ExternalTestSummary {
  /** batch_curriculum row id: one card per batch placement. */
  placementId: number;
  contentItemId: string;
  batchId: string;
  batchName: string;
  title: string;
  description: string | null;
  provider: string;
  /** Only while the window is open, and only a validated https link. */
  url: string | null;
  durationMinutes: number | null;
  availableFrom: Date | null;
  dueAt: Date | null;
  windowState: 'upcoming' | 'open' | 'closed';
  /** The imported result for this batch and assessment code, if any. */
  result: { obtainedScore: number; maxScore: number; percentage: number; importedAt: Date } | null;
}
