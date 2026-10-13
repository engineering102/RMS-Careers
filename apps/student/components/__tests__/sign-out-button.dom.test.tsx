// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach, type MockInstance } from 'vitest';
import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SignOutButton, SIGN_OUT_DIALOG_COPY } from '../shell/sign-out-button';
import { MobileNav } from '../shell/mobile-nav';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';

vi.mock('next/navigation', () => ({ usePathname: () => '/overview', useRouter: () => ({ refresh: vi.fn() }) }));
// The cohort switcher pulls in a Server Action; it is irrelevant to sign-out.
vi.mock('../shell/cohort-switcher', () => ({ CohortSwitcher: () => null }));

let requestSubmit: MockInstance<HTMLFormElement['requestSubmit']>;

beforeEach(() => {
  // jsdom cannot navigate; record the submit instead of performing it.
  requestSubmit = vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderButton() {
  const user = userEvent.setup();
  render(
    <SignOutButton label="Sign out">
      <span aria-hidden="true">icon</span>
    </SignOutButton>
  );
  return { user, trigger: screen.getByRole('button', { name: 'Sign out' }) };
}

const dialog = () => screen.getByRole('alertdialog');
const confirmButton = () => within(dialog()).getByRole('button', { name: SIGN_OUT_DIALOG_COPY.confirmLabel });
const cancelButton = () => within(dialog()).getByRole('button', { name: 'Cancel' });

describe('SignOutButton (browser behaviour)', () => {
  it('opens an accessible confirmation instead of signing out straight away', async () => {
    const { user, trigger } = renderButton();
    expect(screen.queryByRole('alertdialog')).toBeNull();

    await user.click(trigger);

    expect(requestSubmit).not.toHaveBeenCalled();
    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.title)).toBeTruthy();
    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.description)).toBeTruthy();
    // Title and description are wired to the dialog for screen readers.
    expect(dialog().getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog().getAttribute('aria-describedby')).toBeTruthy();
    expect(document.activeElement).toBe(confirmButton());
  });

  it('Cancel keeps the session: no submit, dialog closes, focus returns to the trigger', async () => {
    const { user, trigger } = renderButton();
    await user.click(trigger);
    await user.click(cancelButton());

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape cancels the same way', async () => {
    const { user, trigger } = renderButton();
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(requestSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('confirming submits the sign-out form once and locks the dialog while pending', async () => {
    const { user, trigger } = renderButton();
    await user.click(trigger);
    const confirm = confirmButton();
    await user.click(confirm);

    expect(requestSubmit).toHaveBeenCalledTimes(1);
    const form = requestSubmit.mock.contexts[0] as HTMLFormElement;
    expect(form.getAttribute('action')).toBe('/api/session/sign-out');
    expect(form.getAttribute('method')).toBe('post');

    // Pending: both buttons disabled, progress label shown, cannot be dismissed.
    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.pendingLabel)).toBeTruthy();
    for (const button of within(dialog()).getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    // A second click on the (disabled) confirm button does not submit again.
    await user.click(confirm);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('keyboard only: Enter opens, focus is trapped between Cancel and Sign out, Enter confirms', async () => {
    const { user, trigger } = renderButton();
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(confirmButton());

    await user.tab();
    expect(document.activeElement).toBe(cancelButton());
    await user.tab();
    expect(document.activeElement).toBe(confirmButton());
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(cancelButton());
    expect(dialog().contains(document.activeElement)).toBe(true);

    await user.tab({ shift: true });
    await user.keyboard('{Enter}');
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });

  it('resets after the page is restored from the back/forward cache', async () => {
    const { user, trigger } = renderButton();
    await user.click(trigger);
    await user.click(confirmButton());
    expect(requestSubmit).toHaveBeenCalledTimes(1);

    const restored = new Event('pageshow');
    Object.defineProperty(restored, 'persisted', { value: true });
    await React.act(async () => {
      window.dispatchEvent(restored);
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();

    await user.click(trigger);
    expect((confirmButton() as HTMLButtonElement).disabled).toBe(false);
    await user.click(confirmButton());
    expect(requestSubmit).toHaveBeenCalledTimes(2);
  });

  it('ignores a normal (non-restored) pageshow', async () => {
    const { user, trigger } = renderButton();
    await user.click(trigger);
    await user.click(confirmButton());

    await React.act(async () => {
      window.dispatchEvent(new Event('pageshow'));
    });
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(within(dialog()).getByText(SIGN_OUT_DIALOG_COPY.pendingLabel)).toBeTruthy();
  });
});

describe('Sign-out from the mobile navigation drawer', () => {
  const context = {
    student: { fullName: 'Test Student', collegeName: 'Test College' },
    activeBatches: []
  } as unknown as StudentEntitlementContext;

  it('confirms on top of the drawer, and Cancel leaves the drawer open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MobileNav context={context} open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(document.activeElement).toBe(confirmButton());

    await user.click(cancelButton());
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('navigation', { name: 'Mobile Navigation' })).toBeTruthy();
    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it('confirming from the drawer submits the sign-out form', async () => {
    const user = userEvent.setup();
    render(<MobileNav context={context} open onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await user.click(confirmButton());
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });
});
