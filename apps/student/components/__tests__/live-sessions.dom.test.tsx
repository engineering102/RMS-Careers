// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('server-only', () => ({}));

import { LiveSessionCard } from '../batch-workspace/live-session-card';
import { WorkspaceSubnav } from '../batch-workspace/workspace-subnav';
import type { StudentLiveSession } from '@/lib/db/queries/live-sessions';

afterEach(() => cleanup());

const session = (overrides: Partial<StudentLiveSession> = {}): StudentLiveSession => ({
  id: 's-1',
  title: 'DSA Live Problem Solving',
  description: 'Patterns walkthrough',
  meetingUrl: 'https://us06web.zoom.us/j/12345678901?pwd=abc',
  joiningInstructions: 'Join 5 minutes early.\nKeep your camera on.',
  recurrenceDays: [1, 3, 5],
  startTime: '19:00',
  durationMinutes: 90,
  startsOn: null,
  endsOn: null,
  ...overrides
});

// Wednesday 4 Nov 2026, 10:00 IST
const NOW = new Date('2026-11-04T04:30:00Z');

describe('LiveSessionCard', () => {
  it('shows the schedule, the next session in IST and an accessible Join link that opens in a new tab', () => {
    render(<LiveSessionCard session={session()} now={NOW} isReadOnly={false} />);
    expect(screen.getByRole('heading', { name: 'DSA Live Problem Solving' })).toBeTruthy();
    expect(screen.getByText('Every Mon, Wed, Fri · 7:00 pm – 8:30 pm IST')).toBeTruthy();
    expect(screen.getByText('Wed, 4 Nov 2026, 7:00 pm IST')).toBeTruthy();
    const join = screen.getByRole('link', { name: 'Join DSA Live Problem Solving on Zoom (opens in new tab)' });
    expect(join.getAttribute('href')).toBe('https://us06web.zoom.us/j/12345678901?pwd=abc');
    expect(join.getAttribute('target')).toBe('_blank');
    expect(join.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText(/Keep your camera on/)).toBeTruthy();
  });

  it('never renders an unusable link as an anchor', () => {
    render(<LiveSessionCard session={session({ meetingUrl: 'javascript:alert(1)' })} now={NOW} isReadOnly={false} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/Meeting link unavailable/)).toBeTruthy();
  });

  it('hides Join for a completed batch and after the schedule ended', () => {
    render(<LiveSessionCard session={session()} now={NOW} isReadOnly />);
    expect(screen.queryByRole('link')).toBeNull();
    cleanup();
    render(<LiveSessionCard session={session({ endsOn: '2026-11-01' })} now={NOW} isReadOnly={false} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Schedule ended 2026-11-01')).toBeTruthy();
  });
});

describe('WorkspaceSubnav', () => {
  it('links Curriculum Timeline and Live Lectures and marks the current page', () => {
    render(<WorkspaceSubnav batchId="b-1" activeTab="live" />);
    const nav = screen.getByRole('navigation', { name: 'Batch workspace' });
    const curriculum = screen.getByRole('link', { name: 'Curriculum Timeline' });
    const live = screen.getByRole('link', { name: 'Live Lectures' });
    expect(nav.contains(live)).toBe(true);
    expect(curriculum.getAttribute('href')).toBe('/batches/b-1');
    expect(live.getAttribute('href')).toBe('/batches/b-1/live');
    expect(live.getAttribute('aria-current')).toBe('page');
    expect(curriculum.getAttribute('aria-current')).toBeNull();
    expect(screen.queryByText(/Coming Soon/i)).toBeNull();
    expect(screen.queryByText('Batch Assessments')).toBeNull();
  });
});
