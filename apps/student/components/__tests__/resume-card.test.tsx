import { describe, it, expect } from 'vitest';
import React from 'react';
import { ResumeLearningCard } from '../dashboard/resume-learning-card';
import { NextLessonBanner } from '../content-player/next-lesson-banner';
import type { ResumeLearningTarget } from '@/lib/types/progress';

describe('Phase 4 — Slice 4: ResumeLearningCard Component', () => {
  it('renders actionable Resume Learning card with lesson title and details', () => {
    const target: ResumeLearningTarget = {
      hasTarget: true,
      batchId: 'batch-01',
      batchName: 'Full-Stack 2026 Batch A',
      contentItemId: 'item-01',
      contentTitle: 'Understanding React Server Components',
      contentType: 'lecture',
      weekNumber: 1,
      sequenceOrder: 1,
      dueAt: new Date('2026-09-10'),
      status: 'not_started',
      reason: 'next_in_sequence',
      completionPercentage: 25
    };

    const element = ResumeLearningCard({ target });
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.props['data-testid']).toBe('resume-learning-card');
  });

  it('renders Needs Revision variant with appropriate alert styling', () => {
    const target: ResumeLearningTarget = {
      hasTarget: true,
      batchId: 'batch-01',
      batchName: 'Full-Stack 2026 Batch A',
      contentItemId: 'item-project',
      contentTitle: 'Full-Stack SaaS Capstone',
      contentType: 'project',
      weekNumber: 2,
      sequenceOrder: 1,
      dueAt: null,
      status: 'needs_revision',
      reason: 'in_progress_resubmission',
      completionPercentage: 40
    };

    const element = ResumeLearningCard({ target });
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.props['data-testid']).toBe('resume-learning-card');
    expect(element?.props.className).toContain('border-rose-800/50');
  });

  it('renders All Caught Up celebratory card when unlocked weeks are completed', () => {
    const target: ResumeLearningTarget = {
      hasTarget: false,
      isCaughtUp: true,
      batchId: 'batch-01',
      batchName: 'Full-Stack 2026 Batch A',
      nextUnlockDate: new Date('2026-09-15'),
      completionPercentage: 75
    };

    const element = ResumeLearningCard({ target });
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.props['data-testid']).toBe('resume-learning-caught-up');
  });

  it('renders Curriculum Completed celebration card when entire cohort is finished', () => {
    const target: ResumeLearningTarget = {
      hasTarget: false,
      isCurriculumCompleted: true,
      batchId: 'batch-01',
      batchName: 'Full-Stack 2026 Batch A',
      completionPercentage: 100
    };

    const element = ResumeLearningCard({ target });
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.props['data-testid']).toBe('resume-learning-completed');
  });

  it('renders Un-enrolled variant with library exploration CTA when student has no active batches', () => {
    const target: ResumeLearningTarget = {
      hasTarget: false,
      hasNoEnrollments: true
    };

    const element = ResumeLearningCard({ target });
    expect(React.isValidElement(element)).toBe(true);
    expect(element?.props['data-testid']).toBe('resume-learning-no-enrollment');
  });
});

describe('Phase 4 — Slice 4: NextLessonBanner Component', () => {
  it('renders sequential Next Lesson banner when next item is available', () => {
    const banner = NextLessonBanner({
      batchId: 'batch-01',
      batchName: 'Full-Stack 2026',
      nextItem: {
        contentItemId: 'item-next',
        title: 'Deep Dive into Database Migrations',
        contentType: 'lecture',
        weekNumber: 1,
        sequenceOrder: 2
      },
      isCurrentItemCompleted: true
    });

    expect(React.isValidElement(banner)).toBe(true);
    expect(banner.props['aria-label']).toBe('Next Lesson Navigation');
  });

  it('renders end-of-curriculum state when no subsequent items exist', () => {
    const banner = NextLessonBanner({
      batchId: 'batch-01',
      batchName: 'Full-Stack 2026',
      nextItem: null,
      isCurrentItemCompleted: true
    });

    expect(React.isValidElement(banner)).toBe(true);
    expect(banner.props['aria-label']).toBe('Next Lesson Navigation');
  });
});
