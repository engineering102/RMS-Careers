export type DomainEvent =
  | {
      type: 'STUDENT_ACTIVATED';
      userId: string;
      studentId: number;
      email?: string;
    }
  | {
      type: 'PROJECT_REVIEWED';
      studentId: number;
      userId?: string;
      assignmentTitle: string;
      status: 'submitted' | 'under_review' | 'approved' | 'resubmission_requested';
      score: number;
      tutorFeedback?: string;
      actionUrl?: string;
    }
  | {
      type: 'ASSESSMENT_DUE_SOON';
      studentId: number;
      userId?: string;
      quizTitle: string;
      dueAt: Date;
      actionUrl?: string;
    }
  | {
      type: 'MILESTONE_UNLOCKED';
      studentId: number;
      userId?: string;
      milestoneTitle: string;
      batchName?: string;
      actionUrl?: string;
    }
  | {
      type: 'STREAK_MILESTONE';
      studentId: number;
      userId?: string;
      streakCount: number;
      actionUrl?: string;
    };

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationSummary {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
}

export type NotificationFilter = 'all' | 'unread';
