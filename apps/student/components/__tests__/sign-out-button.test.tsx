import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  SignOutButton,
  SIGN_OUT_DIALOG_COPY,
  createSubmitGuard,
  submitForm
} from '../shell/sign-out-button';

describe('SignOutButton', () => {
  it('renders the native POST form to the sign-out route with a non-submitting trigger', () => {
    const markup = renderToStaticMarkup(
      <SignOutButton label="Sign out" formClassName="hidden sm:block" className="trigger">
        <span>icon</span>
      </SignOutButton>
    );
    expect(markup).toContain('action="/api/session/sign-out"');
    expect(markup).toContain('method="post"');
    expect(markup).toContain('class="hidden sm:block"');
    // The trigger only opens the confirmation; it must not submit the form by itself.
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain('type="submit"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-label="Sign out"');
  });

  it('keeps the confirmation closed until the trigger is used', () => {
    const markup = renderToStaticMarkup(<SignOutButton>Sign out</SignOutButton>);
    expect(markup).not.toContain(SIGN_OUT_DIALOG_COPY.title);
    expect(markup).not.toContain('role="alertdialog"');
  });

  it('explains what signing out does', () => {
    expect(SIGN_OUT_DIALOG_COPY.description).toMatch(/all your devices/);
    expect(SIGN_OUT_DIALOG_COPY.confirmLabel).toBe('Sign out');
  });
});

describe('createSubmitGuard', () => {
  it('submits exactly once however many times confirm fires', () => {
    const guard = createSubmitGuard();
    const submit = vi.fn();
    expect(guard.trySubmit(submit)).toBe(true);
    expect(guard.trySubmit(submit)).toBe(false);
    expect(guard.trySubmit(submit)).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(guard.submitted).toBe(true);
  });

  it('allows a new submit after reset (page restored from the back/forward cache)', () => {
    const guard = createSubmitGuard();
    const submit = vi.fn();
    guard.trySubmit(submit);
    guard.reset();
    expect(guard.submitted).toBe(false);
    expect(guard.trySubmit(submit)).toBe(true);
    expect(submit).toHaveBeenCalledTimes(2);
  });
});

describe('submitForm', () => {
  it('prefers requestSubmit and falls back to submit', () => {
    const requestSubmit = vi.fn();
    const submit = vi.fn();
    submitForm({ requestSubmit, submit } as unknown as HTMLFormElement);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();

    const legacySubmit = vi.fn();
    submitForm({ submit: legacySubmit } as unknown as HTMLFormElement);
    expect(legacySubmit).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a form', () => {
    expect(() => submitForm(null)).not.toThrow();
  });
});
