import type { HeatmapDay } from '@/lib/types/overview';

export interface StudentAcademicProfile {
  studentId: number;
  fullName: string;
  email: string;
  phone: string | null;
  collegeName: string;
  collegeCode: string | null;
  branch: string | null;
  year: number | null;
  collegeRollNumber: string | null;
  createdAt: Date;
}

export interface StudentCareerProfile {
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  targetCompanies: string | null;
  primaryLanguage: string | null;
}

export interface TopicProgress {
  topicSlug: string;
  topicTitle: string;
  totalQuestions: number;
  solvedQuestions: number;
  percentage: number;
}

export interface CategoryXpBreakdown {
  category: 'dsa' | 'quizzes' | 'projects' | 'external';
  label: string;
  xp: number;
  percentage: number;
}

export interface StudentStatsSummary {
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  dsaSolvedCount: number;
}

export interface StudentProfileData {
  academic: StudentAcademicProfile;
  career: StudentCareerProfile;
  stats: StudentStatsSummary;
  topicProgress: TopicProgress[];
  heatmap: {
    days: HeatmapDay[];
    totalActiveDays: number;
    totalPeriodXp: number;
    startDate: string;
    endDate: string;
  };
  xpBreakdown: CategoryXpBreakdown[];
}

export interface UpdateStudentCareerProfileInput {
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  targetCompanies?: string | null;
  primaryLanguage?: string | null;
}
