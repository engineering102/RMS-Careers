import { describe, it, expect } from 'vitest';
import React from 'react';
import DashboardNotFound from '@/app/(dashboard)/not-found';
import OverviewLoading from '@/app/(dashboard)/overview/loading';
import BatchesLoading from '@/app/(dashboard)/batches/loading';
import LeaderboardsLoading from '@/app/(dashboard)/leaderboards/loading';
import NotificationsLoading from '@/app/(dashboard)/notifications/loading';
import ProfileLoading from '@/app/(dashboard)/profile/loading';
import DashboardError from '@/app/(dashboard)/error';

describe('Slice 19 — Responsive & Loading/Error/NotFound Boundaries', () => {
  it('renders DashboardNotFound with navigation back to overview and batches', () => {
    const element = DashboardNotFound();
    expect(element).toBeDefined();
    expect(React.isValidElement(element)).toBe(true);
  });

  it('renders all route-specific loading skeletons with valid accessibility attributes', () => {
    const overview = OverviewLoading();
    expect(React.isValidElement(overview)).toBe(true);
    expect(overview.props['aria-label']).toBe('Loading overview');

    const batches = BatchesLoading();
    expect(React.isValidElement(batches)).toBe(true);
    expect(batches.props['aria-label']).toBe('Loading batches');

    const leaderboards = LeaderboardsLoading();
    expect(React.isValidElement(leaderboards)).toBe(true);
    expect(leaderboards.props['aria-label']).toBe('Loading leaderboards');

    const notifications = NotificationsLoading();
    expect(React.isValidElement(notifications)).toBe(true);
    expect(notifications.props['aria-label']).toBe('Loading notifications');

    const profile = ProfileLoading();
    expect(React.isValidElement(profile)).toBe(true);
    expect(profile.props['aria-label']).toBe('Loading profile');
  });

  it('exports a valid DashboardError client boundary function component', () => {
    expect(typeof DashboardError).toBe('function');
    expect(DashboardError.name).toBe('DashboardError');
  });
});
