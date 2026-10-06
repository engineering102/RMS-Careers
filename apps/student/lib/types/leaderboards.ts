export type LeaderboardScope = 'batch' | 'college';
export type LeaderboardTimeframe = 'weekly' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  studentId: number;
  fullName: string;
  branch: string | null;
  xp: number;
  currentStreak: number;
  isCurrentUser: boolean;
}

export interface StudentLeaderboardStanding {
  rank: number | null;
  xp: number;
  currentStreak: number;
  totalParticipants: number;
}

export interface BatchOption {
  batchId: string;
  batchName: string;
  programName?: string;
}

export interface LeaderboardData {
  scope: LeaderboardScope;
  timeframe: LeaderboardTimeframe;
  batchId?: string;
  batchName?: string;
  collegeName?: string;
  entries: LeaderboardEntry[];
  userStanding: StudentLeaderboardStanding;
  weekStartDateIst?: string;
  availableBatches?: BatchOption[];
}
