import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

const TEST_USER_ID = 'usr-1111-2222-3333-4444';
const OTHER_USER_ID = 'usr-9999-8888-7777-6666';
const TEST_STUDENT_ID = 42;

let mockNotifications: any[] = [];
let mockStudents: any[] = [];
let mockAuthContext: any = null;

vi.mock('@/lib/db/queries/entitlements', () => ({
  requireStudentEntitlement: vi.fn(async () => {
    if (!mockAuthContext) {
      return {
        isStudent: false,
        isActive: false,
        student: null,
        enrollments: [],
        activeBatches: [],
        hasActiveEntitlement: false
      };
    }
    return mockAuthContext;
  })
}));

vi.mock('@rms/db', async () => {
  const actual = await vi.importActual<typeof import('@rms/db')>('@rms/db');

  return {
    ...actual,
    db: {
      select: (selectFields?: any) => ({
        from: (table: any) => {
          // Notifications count or list
          if (table === actual.notifications) {
            return {
              where: (cond?: any) => {
                const isCountQuery = selectFields && 'count' in selectFields;
                if (isCountQuery) {
                  return Promise.resolve([{ count: mockNotifications.filter((n) => !n.isRead).length }]);
                }
                const makeListChain = () => {
                  const p = Promise.resolve(mockNotifications);
                  (p as any).orderBy = () => ({
                    limit: () => Promise.resolve(mockNotifications)
                  });
                  return p;
                };
                return makeListChain();
              }
            };
          }

          // Students query to resolve userId
          if (table === actual.students) {
            return {
              innerJoin: () => ({
                where: () => ({
                  limit: () => Promise.resolve(mockStudents)
                })
              })
            };
          }

          return {
            where: () => Promise.resolve([])
          };
        }
      }),

      insert: (table: any) => ({
        values: (vals: any) => ({
          returning: () => {
            const row = {
              id: vals.id || 'notif-generated-id',
              userId: vals.userId,
              type: vals.type,
              title: vals.title,
              body: vals.body,
              actionUrl: vals.actionUrl || null,
              isRead: vals.isRead ?? false,
              createdAt: vals.createdAt || new Date()
            };
            mockNotifications.push(row);
            return Promise.resolve([row]);
          }
        })
      }),

      update: (table: any) => ({
        set: (vals: any) => ({
          where: (cond: any) => ({
            returning: () => {
              // Mark matching rows
              const updated: any[] = [];
              mockNotifications.forEach((n) => {
                if (!n.isRead) {
                  n.isRead = true;
                  updated.push({ id: n.id });
                }
              });
              return Promise.resolve(updated);
            }
          })
        })
      })
    }
  };
});

import {
  inAppNotificationConsumer,
  emailNotificationConsumer,
  eventDispatcher,
  dispatchDomainEvent
} from '@/lib/events/dispatcher';
import {
  getStudentNotifications,
  getUnreadNotificationCount
} from '@/lib/db/queries/notifications';
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction
} from '@/lib/actions/notifications';

describe('Slice 17 — Notification Center & Domain Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = [];
    mockStudents = [
      {
        userId: TEST_USER_ID,
        email: 'student@college.edu'
      }
    ];
    mockAuthContext = {
      isStudent: true,
      isActive: true,
      student: {
        id: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        fullName: 'Jane Doe',
        email: 'student@college.edu',
        collegeName: 'Test College',
        branch: 'CSE',
        year: 3
      },
      hasActiveEntitlement: true,
      enrollments: [],
      activeBatches: []
    };
    delete process.env.RESEND_API_KEY;
  });

  describe('1. InAppNotificationConsumer & Domain Event Handlers', () => {
    it('creates in-app notification when STUDENT_ACTIVATED is dispatched', async () => {
      const result = await inAppNotificationConsumer.handle({
        type: 'STUDENT_ACTIVATED',
        userId: TEST_USER_ID,
        studentId: TEST_STUDENT_ID
      });

      expect(result).toBeDefined();
      expect(mockNotifications.length).toBe(1);
      expect(mockNotifications[0].userId).toBe(TEST_USER_ID);
      expect(mockNotifications[0].title).toContain('Welcome to RMS Careers');
      expect(mockNotifications[0].actionUrl).toBe('/overview');
      expect(mockNotifications[0].isRead).toBe(false);
    });

    it('creates in-app notification when PROJECT_REVIEWED is dispatched', async () => {
      const result = await inAppNotificationConsumer.handle({
        type: 'PROJECT_REVIEWED',
        studentId: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        assignmentTitle: 'Distributed Cache in Go',
        status: 'approved',
        score: 95,
        tutorFeedback: 'Superb architecture!'
      });

      expect(result).toBeDefined();
      expect(mockNotifications.length).toBe(1);
      expect(mockNotifications[0].title).toBe('Project Review: Distributed Cache in Go');
      expect(mockNotifications[0].body).toContain('approved');
      expect(mockNotifications[0].body).toContain('95');
      expect(mockNotifications[0].body).toContain('Superb architecture!');
    });

    it('creates in-app notification when ASSESSMENT_DUE_SOON is dispatched', async () => {
      const dueAt = new Date('2026-10-15T18:30:00Z');
      const result = await inAppNotificationConsumer.handle({
        type: 'ASSESSMENT_DUE_SOON',
        studentId: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        quizTitle: 'Graphs & Dynamic Programming Midterm',
        dueAt
      });

      expect(result).toBeDefined();
      expect(mockNotifications.length).toBe(1);
      expect(mockNotifications[0].title).toContain('Graphs & Dynamic Programming Midterm');
      expect(mockNotifications[0].body).toContain('IST');
    });

    it('creates in-app notification for STREAK_MILESTONE', async () => {
      await inAppNotificationConsumer.handle({
        type: 'STREAK_MILESTONE',
        studentId: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        streakCount: 7
      });

      expect(mockNotifications.length).toBe(1);
      expect(mockNotifications[0].title).toContain('7-Day Streak Achieved!');
    });

    it('resolves userId from studentId when userId is omitted on event', async () => {
      await inAppNotificationConsumer.handle({
        type: 'MILESTONE_UNLOCKED',
        studentId: TEST_STUDENT_ID,
        milestoneTitle: 'Advanced Dynamic Programming',
        batchName: 'CSE 2026 Batch Alpha'
      });

      expect(mockNotifications.length).toBe(1);
      expect(mockNotifications[0].userId).toBe(TEST_USER_ID);
      expect(mockNotifications[0].title).toContain('Advanced Dynamic Programming');
    });
  });

  describe('2. EmailNotificationConsumer & Decoupling', () => {
    it('safely skips email when RESEND_API_KEY is not configured', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await emailNotificationConsumer.handle({
        type: 'STUDENT_ACTIVATED',
        userId: TEST_USER_ID,
        studentId: TEST_STUDENT_ID,
        email: 'student@college.edu'
      });

      expect(result).toEqual({
        sent: false,
        reason: 'provider_not_configured'
      });
    });

    it('skips non-critical events without dispatching emails', async () => {
      process.env.RESEND_API_KEY = 're_test_dummy_key';

      const result = await emailNotificationConsumer.handle({
        type: 'STREAK_MILESTONE',
        studentId: TEST_STUDENT_ID,
        streakCount: 5
      });

      expect(result).toEqual({
        sent: false,
        reason: 'not_applicable'
      });
    });

    it('dispatches email via fetch when RESEND_API_KEY is configured', async () => {
      process.env.RESEND_API_KEY = 're_mock_key_valid';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email-msg-999' })
      });
      global.fetch = mockFetch;

      const result = await emailNotificationConsumer.handle({
        type: 'PROJECT_REVIEWED',
        studentId: TEST_STUDENT_ID,
        userId: TEST_USER_ID,
        assignmentTitle: 'Compiler Design',
        status: 'approved',
        score: 100,
        tutorFeedback: 'Clean AST traversal!'
      });

      expect(result).toEqual({
        sent: true,
        messageId: 'email-msg-999'
      });
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, req] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.resend.com/emails');
      expect(req.headers.Authorization).toBe('Bearer re_mock_key_valid');
      expect(JSON.parse(req.body).to).toEqual(['student@college.edu']);
    });
  });

  describe('3. EventDispatcher Fan-Out', () => {
    it('dispatches events to registered consumers without throwing', async () => {
      const results = await dispatchDomainEvent({
        type: 'STUDENT_ACTIVATED',
        userId: TEST_USER_ID,
        studentId: TEST_STUDENT_ID
      });

      expect(results.length).toBe(2);
      expect(results.map((r) => r.consumer)).toContain('InAppNotificationConsumer');
      expect(results.map((r) => r.consumer)).toContain('EmailNotificationConsumer');
    });
  });

  describe('4. Server Queries: getStudentNotifications & getUnreadNotificationCount', () => {
    it('returns empty result when userId is missing', async () => {
      const summary = await getStudentNotifications('');
      expect(summary.notifications).toEqual([]);
      expect(summary.unreadCount).toBe(0);

      const count = await getUnreadNotificationCount('');
      expect(count).toBe(0);
    });

    it('returns mapped notifications and counts', async () => {
      mockNotifications = [
        {
          id: 'notif-1',
          userId: TEST_USER_ID,
          type: 'STUDENT_ACTIVATED',
          title: 'Welcome!',
          body: 'Account ready',
          actionUrl: '/overview',
          isRead: false,
          createdAt: new Date()
        }
      ];

      const summary = await getStudentNotifications(TEST_USER_ID);
      expect(summary.notifications.length).toBe(1);
      expect(summary.notifications[0].title).toBe('Welcome!');
      expect(summary.unreadCount).toBe(1);
    });
  });

  describe('5. Server Actions: markNotificationAsRead & markAllNotificationsAsRead', () => {
    it('rejects unauthenticated requests with UNAUTHORIZED', async () => {
      mockAuthContext = null;

      const res = await markNotificationAsReadAction('550e8400-e29b-41d4-a716-446655440000');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('UNAUTHORIZED');
      }
    });

    it('rejects invalid UUID notification identifiers', async () => {
      const res = await markNotificationAsReadAction('invalid-notif-id');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.code).toBe('INVALID_ID');
      }
    });

    it('marks all notifications as read for current student', async () => {
      mockNotifications = [
        { id: 'n-1', userId: TEST_USER_ID, isRead: false },
        { id: 'n-2', userId: TEST_USER_ID, isRead: false }
      ];

      const res = await markAllNotificationsAsReadAction();
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.markedCount).toBe(2);
      }
      expect(mockNotifications.every((n) => n.isRead)).toBe(true);
    });
  });
});
