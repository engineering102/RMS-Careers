// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));

import { LiveCalendar } from '../batch-workspace/live-calendar';
import { LiveCalendarToolbar } from '../batch-workspace/live-calendar-toolbar';
import { WorkspaceSubnav } from '../batch-workspace/workspace-subnav';
import { buildLiveCalendar } from '@/lib/live/live-calendar-data';
import type { CalendarView } from '@/lib/live/calendar';
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

function renderCalendar(
  sessions: StudentLiveSession[],
  { view = 'week', isReadOnly = false }: { view?: CalendarView; isReadOnly?: boolean } = {}
) {
  const data = buildLiveCalendar(sessions, { view, anchor: '2026-11-04', now: NOW, isReadOnly });
  return render(<LiveCalendar {...data} dayHrefBase="/batches/b-1/live" />);
}

// The desktop grid and the phone agenda are both in the DOM (CSS picks one), so each lecture appears twice.
const WED_LABEL = 'DSA Live Problem Solving, Wed, 4 Nov, 7:00 pm – 8:30 pm IST';

describe('LiveCalendar', () => {
  it('places each occurrence of the week on its day and greys out the ones that are over', () => {
    renderCalendar([session()]);
    expect(screen.getAllByRole('button', { name: WED_LABEL }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Fri, 6 Nov/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Mon, 2 Nov.*, ended$/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Tue, 3 Nov/ })).toBeNull();
    // No meeting link is rendered until a lecture is opened.
    expect(screen.queryByRole('link', { name: /Join/ })).toBeNull();
  });

  it('opens the lecture details with an accessible Join link that opens in a new tab', () => {
    renderCalendar([session()]);
    fireEvent.click(screen.getAllByRole('button', { name: WED_LABEL })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'DSA Live Problem Solving' })).toBeTruthy();
    expect(within(dialog).getByText('Wednesday, 4 November 2026')).toBeTruthy();
    expect(within(dialog).getByText('Every Mon, Wed, Fri · 7:00 pm – 8:30 pm IST')).toBeTruthy();
    expect(within(dialog).getByText(/Keep your camera on/)).toBeTruthy();
    const join = within(dialog).getByRole('link', { name: 'Join DSA Live Problem Solving on Zoom (opens in new tab)' });
    expect(join.getAttribute('href')).toBe('https://us06web.zoom.us/j/12345678901?pwd=abc');
    expect(join.getAttribute('target')).toBe('_blank');
    expect(join.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('shows no Join link for a lecture that is over', () => {
    renderCalendar([session()]);
    fireEvent.click(screen.getAllByRole('button', { name: /Mon, 2 Nov/ })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('link')).toBeNull();
    expect(within(dialog).getByText('This lecture has ended.')).toBeTruthy();
  });

  it('never renders an unusable link as an anchor', () => {
    renderCalendar([session({ meetingUrl: 'javascript:alert(1)' })]);
    fireEvent.click(screen.getAllByRole('button', { name: WED_LABEL })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('link')).toBeNull();
    expect(within(dialog).getByText(/Meeting link unavailable/)).toBeTruthy();
  });

  it('hides Join for a completed batch', () => {
    renderCalendar([session()], { isReadOnly: true });
    fireEvent.click(screen.getAllByRole('button', { name: WED_LABEL })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('link')).toBeNull();
    expect(within(dialog).getByText(/This batch is completed/)).toBeTruthy();
  });

  it('month view lists lectures as chips and links day numbers to the day view', () => {
    renderCalendar([session()], { view: 'month' });
    expect(screen.getAllByRole('button', { name: WED_LABEL }).length).toBeGreaterThan(0);
    const day = screen.getByRole('link', { name: 'Open Wednesday, 4 November 2026' });
    expect(day.getAttribute('href')).toBe('/batches/b-1/live?view=day&date=2026-11-04');
  });
});

describe('LiveCalendarToolbar', () => {
  it('links Today, previous/next and the views, keeping the date', () => {
    render(<LiveCalendarToolbar basePath="/batches/b-1/live" view="week" anchor="2026-11-04" />);
    expect(screen.getByRole('heading', { name: '2 – 8 November 2026' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Today' }).getAttribute('href')).toBe('/batches/b-1/live?view=week');
    expect(screen.getByRole('link', { name: 'Previous week' }).getAttribute('href')).toBe('/batches/b-1/live?view=week&date=2026-10-28');
    expect(screen.getByRole('link', { name: 'Next week' }).getAttribute('href')).toBe('/batches/b-1/live?view=week&date=2026-11-11');
    const views = screen.getByRole('navigation', { name: 'Calendar view' });
    expect(within(views).getByRole('link', { name: 'Week' }).getAttribute('aria-current')).toBe('page');
    expect(within(views).getByRole('link', { name: 'Month' }).getAttribute('href')).toBe('/batches/b-1/live?view=month&date=2026-11-04');
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
