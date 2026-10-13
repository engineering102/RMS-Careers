// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach, type MockInstance } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  SIGN_OUT_DIALOG_COPY,
  SignOutConfirm,
  createSubmitGuard,
  submitForm
} from '@/components/sign-out-confirm';
import { UserMenu } from '../../app/(admin)/user-menu';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));

let requestSubmit: MockInstance<HTMLFormElement['requestSubmit']>;

beforeEach(() => {
  // jsdom cannot navigate; record the submit instead of performing it.
  requestSubmit = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const dialog = () => screen.getByRole('alertdialog');
const confirmButton = () => within(dialog()).getByRole('button', { name: SIGN_OUT_DIALOG_COPY.confirmLabel });
const cancelButton = () => within(dialog()).getByRole('button', { name: 'Cancel' });

async function openFromMenu() {
  const user = userEvent.setup();
  render(<UserMenu user={{ image: null }} />);
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  await user.click(trigger);
  await user.click(await screen.findByRole('menuitem', { name: 'Sign Out' }));
  await screen.findByRole('alertdialog');
  return { user, trigger };
}

describe('Admin user menu sign-out', () => {
  it('selecting Sign Out opens the confirmation instead of signing out', async () => {
    await openFromMenu();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.title)).toBeTruthy();
    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.description)).toBeTruthy();
    expect(document.activeElement).toBe(confirmButton());
  });

  it('Cancel keeps the session and returns focus to the account menu button', async () => {
    const { user, trigger } = await openFromMenu();
    await user.click(cancelButton());
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape cancels the same way', async () => {
    const { user, trigger } = await openFromMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('keyboard only: open the menu, choose Sign Out, focus stays trapped in the dialog', async () => {
    const user = userEvent.setup();
    render(<UserMenu user={{ image: null }} />);
    screen.getByRole('button', { name: 'Account menu' }).focus();
    await user.keyboard('{Enter}');
    const item = await screen.findByRole('menuitem', { name: 'Sign Out' });
    item.focus();
    await user.keyboard('{Enter}');
    await screen.findByRole('alertdialog');
    expect(document.activeElement).toBe(confirmButton());

    await user.tab();
    expect(document.activeElement).toBe(cancelButton());
    await user.tab();
    expect(document.activeElement).toBe(confirmButton());
    await user.tab({ shift: true });
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it('confirming submits the sign-out form once and locks the dialog while pending', async () => {
    const { user } = await openFromMenu();
    const confirm = confirmButton();
    await user.click(confirm);

    expect(requestSubmit).toHaveBeenCalledTimes(1);
    const form = requestSubmit.mock.contexts[0] as HTMLFormElement;
    expect(form.getAttribute('action')).toBe('/api/session/sign-out');
    expect(form.getAttribute('method')).toBe('post');

    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.pendingLabel)).toBeTruthy();
    for (const button of within(dialog()).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    await user.click(confirm);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('other menu items do not open the confirmation', async () => {
    const user = userEvent.setup();
    render(<UserMenu user={{ image: null }} />);
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Settings' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('a signed-out menu offers Sign In and renders no sign-out form', () => {
    render(<UserMenu user={null} />);
    expect(document.querySelector('form[action="/api/session/sign-out"]')).toBeNull();
  });
});

describe('SignOutConfirm', () => {
  it('resets after the page is restored from the back/forward cache', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<SignOutConfirm open onOpenChange={onOpenChange} />);
    await user.click(confirmButton());
    expect(requestSubmit).toHaveBeenCalledTimes(1);

    const restored = new Event('pageshow');
    Object.defineProperty(restored, 'persisted', { value: true });
    await React.act(async () => {
      window.dispatchEvent(restored);
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(<SignOutConfirm open onOpenChange={onOpenChange} />);
    expect((confirmButton() as HTMLButtonElement).disabled).toBe(false);
    await user.click(confirmButton());
    expect(requestSubmit).toHaveBeenCalledTimes(2);
  });
});

describe('createSubmitGuard / submitForm', () => {
  it('submits exactly once until reset', () => {
    const guard = createSubmitGuard();
    const submit = vi.fn();
    expect(guard.trySubmit(submit)).toBe(true);
    expect(guard.trySubmit(submit)).toBe(false);
    guard.reset();
    expect(guard.trySubmit(submit)).toBe(true);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('prefers requestSubmit and falls back to submit', () => {
    const legacy = vi.fn();
    submitForm({ submit: legacy } as unknown as HTMLFormElement);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(() => submitForm(null)).not.toThrow();
  });
});
