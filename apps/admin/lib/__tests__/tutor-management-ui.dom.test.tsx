// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('../../app/(admin)/tutors/actions', () => ({
  createTutorAction: vi.fn(),
  resendTutorInvitationAction: vi.fn(),
  setTutorActiveAction: vi.fn()
}));
vi.mock('../../app/(admin)/batches/[batchId]/tutors/actions', () => ({
  assignTutorAction: vi.fn(),
  unassignTutorAction: vi.fn()
}));

import { TutorsClient } from '../../app/(admin)/tutors/tutors-client';
import { BatchTutorsCard } from '../../app/(admin)/batches/[batchId]/tutors/batch-tutors-card';
import type { TutorListItem } from '../db/queries/tutors';

afterEach(() => cleanup());

const tutor = (overrides: Partial<TutorListItem>): TutorListItem => ({
  tutorId: 't-1',
  userId: 'u-1',
  fullName: 'Asha Rao',
  email: 'asha@example.test',
  headline: null,
  state: 'active',
  assignedBatchCount: 2,
  createdAt: new Date('2026-10-30T10:00:00Z'),
  ...overrides
});

describe('Tutors page', () => {
  it('explains that invitations wait for launch and disables Resend', () => {
    render(<TutorsClient initialTutors={[tutor({ state: 'pending_activation' })]} invitationsEnabled={false} />);
    expect(screen.getByRole('status').textContent).toMatch(/not live yet/);
    const row = screen.getByRole('row', { name: /Asha Rao/ });
    expect(within(row).getByText('Invited')).toBeTruthy();
    expect((within(row).getByRole('button', { name: /Resend invitation/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers Resend only for invited tutors once invitations are enabled', () => {
    render(
      <TutorsClient
        initialTutors={[tutor({ state: 'pending_activation' }), tutor({ tutorId: 't-2', fullName: 'Ben Das', state: 'active' })]}
        invitationsEnabled
      />
    );
    expect(screen.queryByRole('status')).toBeNull();
    const invited = screen.getByRole('row', { name: /Asha Rao/ });
    expect((within(invited).getByRole('button', { name: /Resend invitation/ }) as HTMLButtonElement).disabled).toBe(false);
    const active = screen.getByRole('row', { name: /Ben Das/ });
    expect(within(active).queryByRole('button', { name: /Resend invitation/ })).toBeNull();
    expect(within(active).getByRole('button', { name: /Deactivate/ })).toBeTruthy();
  });

  it('shows Reactivate for an inactive tutor and an empty state with no tutors', () => {
    render(<TutorsClient initialTutors={[tutor({ state: 'inactive' })]} invitationsEnabled />);
    expect(screen.getByRole('button', { name: /Reactivate/ })).toBeTruthy();
    cleanup();
    render(<TutorsClient initialTutors={[]} invitationsEnabled />);
    expect(screen.getByText('Add your first tutor')).toBeTruthy();
  });
});

describe('Batch tutors card', () => {
  it('lists assigned tutors with an accessible Remove and keeps Assign disabled until a tutor is chosen', () => {
    render(
      <BatchTutorsCard
        batchId="b-1"
        batchName="CSE 2026 A"
        assigned={[{ tutorId: 't-1', fullName: 'Asha Rao', email: 'asha@example.test', state: 'active', assignedAt: new Date('2026-10-30T10:00:00Z') }]}
        assignable={[
          { tutorId: 't-1', fullName: 'Asha Rao', email: 'asha@example.test' },
          { tutorId: 't-2', fullName: 'Ben Das', email: 'ben@example.test' }
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: 'Tutors' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Asha Rao from CSE 2026 A' })).toBeTruthy();
    expect((screen.getByRole('button', { name: /Assign/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('points to the Tutors page when no tutor exists', () => {
    render(<BatchTutorsCard batchId="b-1" batchName="CSE 2026 A" assigned={[]} assignable={[]} />);
    expect(screen.getByRole('link', { name: 'Create a tutor' }).getAttribute('href')).toBe('/tutors');
  });
});
