// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import './helpers/jsdom-gestures';

import { CurriculumWeeks } from '../batch-workspace/curriculum-weeks';
import type { CurriculumItem, CurriculumWeek } from '@/lib/types/batch-workspace';
import type { ContentType } from '@/lib/types/library';

let nextId = 1;
function item(title: string, contentType: ContentType, weekNumber: number, isCompleted = false): CurriculumItem {
  return {
    id: nextId++, batchId: 'batch-1', contentItemId: `ci-${title}`, title, slug: title, contentType,
    description: null, metadata: {}, weekNumber, sequenceOrder: nextId, isRequired: true,
    availableFrom: null, dueAt: null, isCompleted, isLocked: false, isOverdue: false,
    status: isCompleted ? 'completed' : 'pending'
  };
}

function week(weekNumber: number, items: CurriculumItem[]): CurriculumWeek {
  return { weekNumber, items, totalCount: items.length, completedCount: items.filter((i) => i.isCompleted).length };
}

const WEEKS = [
  week(1, [item('Intro lecture', 'lecture', 1, true), item('Week 1 quiz', 'quiz', 1, true)]),
  week(2, [item('Arrays lecture', 'lecture', 2), item('Arrays notes', 'notes', 2), item('Two pointers', 'dsa_sheet', 2)]),
  week(3, [item('Capstone', 'project', 3)])
];

const sectionHeader = (name: RegExp) => screen.getByRole('button', { name });
const railSegment = (name: RegExp) =>
  within(screen.getByRole('navigation', { name: 'Curriculum weeks' })).getByRole('button', { name });

afterEach(cleanup);

describe('CurriculumWeeks', () => {
  it('opens on the current week and shows only the sections that week has', () => {
    render(<CurriculumWeeks weeks={WEEKS} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Week 2' })).toBeTruthy();
    expect(sectionHeader(/Lectures/)).toBeTruthy();
    expect(sectionHeader(/Notes & Resources/)).toBeTruthy();
    expect(sectionHeader(/DSA Practice/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Assessments/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Projects/ })).toBeNull();
    // Only one week is on the page.
    expect(screen.queryByText('Intro lecture')).toBeNull();
    expect(screen.queryByText('Capstone')).toBeNull();
  });

  it('toggles a section and moves between weeks with the rail, arrows and up-next link', async () => {
    const user = userEvent.setup();
    render(<CurriculumWeeks weeks={WEEKS} />);

    expect(sectionHeader(/Lectures/).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Arrays lecture')).toBeTruthy();
    await user.click(sectionHeader(/Lectures/));
    expect(sectionHeader(/Lectures/).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Arrays lecture')).toBeNull();

    await user.click(railSegment(/^Week 3, not started$/));
    expect(screen.getByRole('heading', { level: 2, name: 'Week 3' })).toBeTruthy();
    expect(sectionHeader(/Projects/).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Capstone')).toBeTruthy();
    expect(window.location.search).toBe('?week=3');
    expect((screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Week 2' })).toBeTruthy();

    await user.click(railSegment(/^Week 1, completed$/));
    expect(screen.getByRole('heading', { level: 2, name: 'Week 1' })).toBeTruthy();
    expect(sectionHeader(/Assessments/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Up next/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Week 2' })).toBeTruthy();
  });

  it('jumps to a week from the week picker', async () => {
    const user = userEvent.setup();
    render(<CurriculumWeeks weeks={WEEKS} />);

    await user.click(screen.getByRole('button', { name: /Choose a week/ }));
    const options = await screen.findAllByRole('menuitemradio');
    expect(options).toHaveLength(3);
    expect(options[1].getAttribute('aria-checked')).toBe('true');

    await user.click(options[2]);
    expect(screen.getByRole('heading', { level: 2, name: 'Week 3' })).toBeTruthy();
  });

  it('honours a requested week', () => {
    render(<CurriculumWeeks weeks={WEEKS} requestedWeek={3} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Week 3' })).toBeTruthy();
  });
});
