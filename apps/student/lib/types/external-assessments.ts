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
