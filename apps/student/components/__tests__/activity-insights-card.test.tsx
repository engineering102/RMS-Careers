import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityInsightsCard } from '../overview/activity-insights-card';
import { buildActivityInsights } from '@/lib/types/activity-insights';

const TODAY = '2026-10-20';

function count(html: string, testId: string): number {
  return html.split(`data-testid="${testId}"`).length - 1;
}

describe('ActivityInsightsCard', () => {
  it('renders a fixed-size summary: 12 weekly bars and one segment per activity type', () => {
    const insights = buildActivityInsights(
      [
        { activityDateIst: '2026-10-20', activityType: 'dsa_solved', totalXp: 50, count: 2 },
        { activityDateIst: '2026-10-13', activityType: 'quiz_completed', totalXp: 25, count: 1 },
        { activityDateIst: '2026-10-14', activityType: 'dsa_solved', totalXp: 25, count: 1 }
      ],
      TODAY
    );
    const html = renderToStaticMarkup(<ActivityInsightsCard insights={insights} />);

    expect(count(html, 'weekly-xp-bar')).toBe(12);
    expect(count(html, 'xp-mix-segment')).toBe(2);
    // 50 XP this week vs 50 XP last week.
    expect(html).toContain('Same as last week');
    expect(html).toContain('DSA problems');
    expect(html).toContain('Quizzes');
    expect(html).toContain('75 XP · 75%');
    // Accessible text for each week, not just colour/height.
    expect(html).toContain('Week of Oct 19: 50 XP from 2 activities');
  });

  it('shows an invitation instead of an empty bar for a brand-new student', () => {
    const html = renderToStaticMarkup(<ActivityInsightsCard insights={buildActivityInsights([], TODAY)} />);
    expect(count(html, 'weekly-xp-bar')).toBe(12);
    expect(count(html, 'xp-mix-segment')).toBe(0);
    expect(html).toContain('to see where your XP comes from');
    expect(html).not.toContain('vs last week');
  });
});
