import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveActiveCohort,
  ACTIVE_COHORT_COOKIE_NAME,
  ACTIVE_COHORT_COOKIE_MAX_AGE,
  type StudentEntitlementContext
} from '../db/queries/entitlements';
import { setActiveCohortAction } from '../actions/cohort';
import { getDeadlineHref, formatRelativeDeadline } from '../../components/overview/deadlines-card';
import type { StudentDeadlineItem } from '../db/queries/overview';

vi.mock('server-only', () => ({}));

// Mock next/headers
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn()
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookieStore)
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}));

// Mock entitlements query
vi.mock('@/lib/db/queries/entitlements', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/queries/entitlements')>();
  return {
    ...actual,
    requireStudentEntitlement: vi.fn()
  };
});

describe('Phase 4: Multi-Batch Alignment - Cohort Resolution and Switcher', () => {
  const batchA = {
    batchId: '11111111-1111-1111-1111-111111111111',
    batchName: 'Full Stack 2026 Batch A',
    programId: 1,
    programName: 'Full Stack Engineering',
    programCode: 'FS-2026',
    startDate: new Date('2026-01-01'),
    endDate: null
  };

  const batchB = {
    batchId: '22222222-2222-2222-2222-222222222222',
    batchName: 'AI & Data Engineering Batch B',
    programId: 2,
    programName: 'AI & Data Engineering',
    programCode: 'AIDE-2026',
    startDate: new Date('2026-02-01'),
    endDate: null
  };

  const mockContext: StudentEntitlementContext = {
    isStudent: true,
    isActive: true,
    hasActiveEntitlement: true,
    student: {
      id: 101,
      userId: 'u-123',
      fullName: 'Aarav Sharma',
      email: 'student@apex.edu',
      phone: null,
      collegeRollNumber: 'APEX-101',
      branch: 'CSE',
      year: 3,
      collegeId: 'col-1',
      collegeName: 'Apex Institute of Technology',
      collegeCode: 'AIT'
    },
    enrollments: [],
    activeBatches: [batchA, batchB]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('4.1 Server-side Active Cohort Resolution Hierarchy', () => {
    it('Tier 1: Prioritizes explicit route param over query and cookie', () => {
      const active = resolveActiveCohort(mockContext, {
        routeBatchId: batchB.batchId,
        queryBatchId: batchA.batchId,
        cookieBatchId: batchA.batchId
      });
      expect(active).not.toBeNull();
      expect(active?.batchId).toBe(batchB.batchId);
      expect(active?.programCode).toBe('AIDE-2026');
    });

    it('Tier 2: Prioritizes query param over cookie when route param is absent', () => {
      const active = resolveActiveCohort(mockContext, {
        queryBatchId: batchB.batchId,
        cookieBatchId: batchA.batchId
      });
      expect(active).not.toBeNull();
      expect(active?.batchId).toBe(batchB.batchId);
    });

    it('Tier 3: Uses validated cookie when route and query params are absent', () => {
      const active = resolveActiveCohort(mockContext, {
        cookieBatchId: batchB.batchId
      });
      expect(active).not.toBeNull();
      expect(active?.batchId).toBe(batchB.batchId);
    });

    it('Tier 4: Falls back to activeBatches[0] when route, query, and cookie are absent', () => {
      const active = resolveActiveCohort(mockContext, {});
      expect(active).not.toBeNull();
      expect(active?.batchId).toBe(batchA.batchId);
    });

    it('Tier 5: Returns null when student has no active batches', () => {
      const emptyContext: StudentEntitlementContext = {
        ...mockContext,
        hasActiveEntitlement: false,
        activeBatches: []
      };
      const active = resolveActiveCohort(emptyContext, {
        cookieBatchId: batchA.batchId
      });
      expect(active).toBeNull();
    });

    it('Security: Rejects unauthorized routeBatchId and falls back down hierarchy', () => {
      const unauthorizedId = '99999999-9999-9999-9999-999999999999';
      const active = resolveActiveCohort(mockContext, {
        routeBatchId: unauthorizedId,
        queryBatchId: batchB.batchId
      });
      expect(active?.batchId).toBe(batchB.batchId);
    });

    it('Security: Rejects unauthorized queryBatchId and falls back to cookie', () => {
      const unauthorizedId = '99999999-9999-9999-9999-999999999999';
      const active = resolveActiveCohort(mockContext, {
        queryBatchId: unauthorizedId,
        cookieBatchId: batchB.batchId
      });
      expect(active?.batchId).toBe(batchB.batchId);
    });

    it('Security: Rejects unauthorized or tampered cookie and falls back to activeBatches[0]', () => {
      const unauthorizedId = '99999999-9999-9999-9999-999999999999';
      const active = resolveActiveCohort(mockContext, {
        cookieBatchId: unauthorizedId
      });
      expect(active?.batchId).toBe(batchA.batchId);
    });

    it('Security: Safely handles malformed strings without throwing', () => {
      const active = resolveActiveCohort(mockContext, {
        routeBatchId: 'not-a-valid-uuid',
        queryBatchId: '../../../etc/passwd',
        cookieBatchId: '<script>alert(1)</script>'
      });
      expect(active?.batchId).toBe(batchA.batchId);
    });
  });

  describe('4.1 Server Action: setActiveCohortAction', () => {
    it('rejects unauthenticated requests', async () => {
      const { requireStudentEntitlement } = await import('@/lib/db/queries/entitlements');
      vi.mocked(requireStudentEntitlement).mockImplementationOnce(async () => {
        throw new Error('NEXT_REDIRECT:/login');
      });

      const res = await setActiveCohortAction(batchA.batchId);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized: Please log in');
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it('rejects invalid UUID input', async () => {
      const res = await setActiveCohortAction('invalid-batch-id');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid batch identifier format.');
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it('rejects batchId when student is not actively enrolled in it', async () => {
      const { requireStudentEntitlement } = await import('@/lib/db/queries/entitlements');
      vi.mocked(requireStudentEntitlement).mockResolvedValueOnce(mockContext);

      const unEnrolledBatchId = '33333333-3333-3333-3333-333333333333';
      const res = await setActiveCohortAction(unEnrolledBatchId);

      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'UnauthorizedBatchSelection: You are not actively enrolled in this cohort.'
      );
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it('persists validated cohort in cookie with 30-day lifetime and Lax SameSite', async () => {
      const { requireStudentEntitlement } = await import('@/lib/db/queries/entitlements');
      vi.mocked(requireStudentEntitlement).mockResolvedValueOnce(mockContext);

      const res = await setActiveCohortAction(batchB.batchId);

      expect(res.success).toBe(true);
      expect(res.activeBatchId).toBe(batchB.batchId);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        ACTIVE_COHORT_COOKIE_NAME,
        batchB.batchId,
        {
          path: '/',
          sameSite: 'lax',
          httpOnly: false,
          maxAge: ACTIVE_COHORT_COOKIE_MAX_AGE
        }
      );
      expect(ACTIVE_COHORT_COOKIE_MAX_AGE).toBe(2592000); // 30 days
      expect(ACTIVE_COHORT_COOKIE_NAME).toBe('rms_active_cohort');
    });
  });

  describe('4.2 Aggregated Learning Hub - Deadlines Deep Linking & Relative Status', () => {
    const baseItem: StudentDeadlineItem = {
      id: 1,
      batchId: '11111111-1111-1111-1111-111111111111',
      batchName: 'Full Stack 2026 Batch A',
      contentItemId: 'ci-42',
      title: 'Dynamic Programming Practice',
      contentType: 'dsa_sheet',
      weekNumber: 3,
      dueAt: new Date(Date.now() + 86400000), // tomorrow
      isCompleted: false
    };

    it('generates correct deep link for dsa_sheet', () => {
      const href = getDeadlineHref({ ...baseItem, contentType: 'dsa_sheet' });
      expect(href).toBe('/dsa?batchId=11111111-1111-1111-1111-111111111111');
    });

    it('generates correct deep link for quiz', () => {
      const href = getDeadlineHref({ ...baseItem, contentType: 'quiz' });
      expect(href).toBe('/assessments?batchId=11111111-1111-1111-1111-111111111111');
    });

    it('generates correct deep link for lecture', () => {
      const href = getDeadlineHref({ ...baseItem, contentType: 'lecture' });
      expect(href).toBe('/content/ci-42?batchId=11111111-1111-1111-1111-111111111111');
    });

    it('generates correct deep link for project', () => {
      const href = getDeadlineHref({ ...baseItem, contentType: 'project' });
      expect(href).toBe('/content/ci-42?batchId=11111111-1111-1111-1111-111111111111');
    });

    it('computes Past Due status correctly for expired deadlines', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const status = formatRelativeDeadline(pastDate);
      expect(status.text).toBe('Past Due');
      expect(status.isOverdue).toBe(true);
      expect(status.isUrgent).toBe(true);
    });

    it('computes Due Today status correctly', () => {
      // 2 hours in future today
      const todayDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const status = formatRelativeDeadline(todayDate);
      expect(status.isOverdue).toBe(false);
      expect(status.isUrgent).toBe(true);
    });

    it('computes Due Tomorrow status correctly', () => {
      const tomorrowDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const status = formatRelativeDeadline(tomorrowDate);
      expect(status.isOverdue).toBe(false);
      expect(status.isUrgent).toBe(true);
    });
  });
});
