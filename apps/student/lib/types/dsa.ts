export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DSAQuestion {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string;
  problemStatement: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  starterCode?: {
    python?: string;
    cpp?: string;
    java?: string;
    javascript?: string;
  };
  hints: string[];
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  externalUrl?: string;
}

export interface DSASheet {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  estimatedHours: number;
  patternCount: number;
  questions: DSAQuestion[];
}

export interface StudentProblemProgress {
  problemSlug: string;
  isCompleted: boolean;
  submissionUrl: string | null;
  notes: string | null;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface DsaProgressSummary {
  totalProblems: number;
  totalSolved: number;
  overallPercentage: number;
  easyTotal: number;
  easySolved: number;
  mediumTotal: number;
  mediumSolved: number;
  hardTotal: number;
  hardSolved: number;
}

export interface SheetProgressSummary {
  sheetSlug: string;
  sheetTitle: string;
  totalProblems: number;
  solvedCount: number;
  percentage: number;
}

export interface StudentDsaData {
  sheets: DSASheet[];
  progressMap: Record<string, StudentProblemProgress>;
  summary: DsaProgressSummary;
  sheetSummaries: SheetProgressSummary[];
}

export interface RecordDsaProblemInput {
  problemSlug: string;
  submissionUrl?: string;
  notes?: string;
  batchId?: string;
}
