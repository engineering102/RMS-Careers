// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const actions = vi.hoisted(() => ({ createContentAction: vi.fn() }));
const push = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));

vi.mock('../../app/(admin)/content/actions', () => actions);
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import { CreateContentDialog, toCreateInput } from '../../app/(admin)/content/create-content-dialog';

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  actions.createContentAction.mockReset();
  push.mockReset();
  for (const fn of Object.values(toast)) fn.mockReset();
});
afterEach(() => cleanup());

function renderDialog() {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  render(<CreateContentDialog open onOpenChange={onOpenChange} programs={[]} />);
  return { user, onOpenChange };
}

const pick = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(screen.getByRole('radio', { name }));

describe('Create content: choosing a type opens that type’s form', () => {
  it('starts on the type cards only, with no fields to fill', () => {
    renderDialog();
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    expect(screen.queryByLabelText(/Title/)).toBeNull();
  });

  it('a video lecture asks for the video link and duration, not document or test fields', async () => {
    const { user } = renderDialog();
    await pick(user, /Video lecture/);
    expect(screen.getByRole('heading', { name: 'New video lecture' })).toBeTruthy();
    expect(screen.getByLabelText('Video link')).toBeTruthy();
    expect(screen.getByLabelText('Duration (minutes)')).toBeTruthy();
    expect(screen.queryByLabelText('Document link')).toBeNull();
    expect(screen.queryByLabelText('Test link')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Title *'));
  });

  it('an external test asks for the link, platform, code and time limit, with Instructions', async () => {
    const { user } = renderDialog();
    await pick(user, /External test/);
    expect(screen.getByLabelText('Test link')).toBeTruthy();
    expect((screen.getByLabelText('Platform') as HTMLInputElement).value).toBe('QwikTest');
    expect(screen.getByLabelText('Assessment code')).toBeTruthy();
    expect(screen.getByLabelText('Time limit (minutes)')).toBeTruthy();
    expect(screen.getByLabelText('Instructions')).toBeTruthy();
    expect(screen.queryByLabelText('Video link')).toBeNull();
    expect(screen.queryByLabelText('Show in the student Library')).toBeNull();
  });

  it('a DSA sheet asks for the catalogue slug and will not create without it', async () => {
    const { user } = renderDialog();
    await pick(user, /DSA sheet/);
    await user.type(screen.getByLabelText('Title *'), 'Blind 75');
    await user.click(screen.getByRole('button', { name: 'Create & open builder' }));
    expect(screen.getByText(/slug of the DSA catalogue sheet/)).toBeTruthy();
    expect(actions.createContentAction).not.toHaveBeenCalled();
  });

  it('Change type goes back to the cards and keeps what was typed', async () => {
    const { user } = renderDialog();
    await pick(user, /Reading/);
    await user.type(screen.getByLabelText('Title *'), 'Big-O');
    await user.click(screen.getByRole('button', { name: 'Change type' }));
    expect(screen.getByRole('radio', { name: /Reading/ }).getAttribute('aria-checked')).toBe('true');
    await pick(user, /Resource link/);
    expect((screen.getByLabelText('Title *') as HTMLInputElement).value).toBe('Big-O');
  });

  it('creates a lecture with what was entered and opens the builder', async () => {
    actions.createContentAction.mockResolvedValue({ success: true, item: { id: 'new-1', isPublished: false } });
    const { user, onOpenChange } = renderDialog();
    await pick(user, /Video lecture/);
    await user.type(screen.getByLabelText('Title *'), 'Sliding Window');
    await user.type(screen.getByLabelText('Video link'), 'https://youtu.be/dQw4w9WgXcQ');
    await user.type(screen.getByLabelText('Duration (minutes)'), '42');
    await user.click(screen.getByRole('button', { name: 'Create & open builder' }));

    expect(actions.createContentAction).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sliding Window',
        contentType: 'lecture',
        videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
        durationMinutes: 42
      })
    );
    expect(push).toHaveBeenCalledWith('/content/new-1');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('a practice quiz opens the quiz workbench next and is never published at creation', async () => {
    actions.createContentAction.mockResolvedValue({ success: true, item: { id: 'quiz-1', isPublished: false } });
    const { user } = renderDialog();
    await pick(user, /Practice quiz/);
    expect(screen.queryByLabelText('Publish immediately')).toBeNull();
    await user.type(screen.getByLabelText('Title *'), 'Arrays check');
    await user.click(screen.getByRole('button', { name: 'Create & add questions' }));
    expect(actions.createContentAction).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'quiz', quizType: 'practice', isPublished: false })
    );
    expect(push).toHaveBeenCalledWith('/content/quiz-1/quiz');
  });

  it('shows a server field error next to its field and stays open', async () => {
    actions.createContentAction.mockResolvedValue({
      success: false,
      error: 'Test link must be an https:// address.',
      fieldErrors: { externalUrl: ['Test link must be an https:// address.'] }
    });
    const { user, onOpenChange } = renderDialog();
    await pick(user, /External test/);
    await user.type(screen.getByLabelText('Title *'), 'Aptitude 1');
    await user.type(screen.getByLabelText('Test link'), 'http://x.example');
    await user.click(screen.getByRole('button', { name: 'Create & open builder' }));
    expect(screen.getByRole('alert').textContent).toMatch(/https/);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});

describe('toCreateInput', () => {
  const form = {
    title: ' T ',
    slug: '',
    description: '',
    programId: '7',
    topic: '',
    subject: '',
    inLibrary: true,
    videoUrl: 'https://youtu.be/x',
    resourceLink: 'https://doc',
    notes: 'n',
    durationMinutes: '15',
    externalProvider: 'QwikTest',
    externalUrl: 'https://t.example/1',
    assessmentCode: 'C1',
    isPublished: true
  };

  it('sends only the chosen type’s own fields', () => {
    const input = toCreateInput('resource', form);
    expect(input).toMatchObject({ title: 'T', contentType: 'resource', programId: 7, resourceLink: 'https://doc', notesMarkdown: 'n', durationMinutes: 15 });
    expect(input).not.toHaveProperty('videoUrl');
    expect(input).not.toHaveProperty('externalUrl');
  });

  it('never publishes a new quiz and sends no duration for it', () => {
    const input = toCreateInput('formal_assessment', form);
    expect(input).toMatchObject({ contentType: 'quiz', quizType: 'formal', isPublished: false });
    expect(input).not.toHaveProperty('durationMinutes');
  });
});
