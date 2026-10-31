'use client';

import * as React from 'react';
import { SIGN_OUT_PATH } from '@/lib/constants/session';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Lets the sign-out form submit once. A second confirm (double click, Enter held down) is ignored
 * until reset() runs, which happens when the browser restores this page from the back/forward cache.
 */
export function createSubmitGuard() {
  let submitted = false;
  return {
    trySubmit(submit: () => void): boolean {
      if (submitted) return false;
      submitted = true;
      submit();
      return true;
    },
    reset() {
      submitted = false;
    },
    get submitted() {
      return submitted;
    }
  };
}

/** Submits through the form's own submit path (fires `submit`); older browsers fall back to submit(). */
export function submitForm(form: HTMLFormElement | null): void {
  if (!form) return;
  if (typeof form.requestSubmit === 'function') form.requestSubmit();
  else form.submit();
}

export const SIGN_OUT_DIALOG_COPY = {
  title: 'Sign out?',
  description:
    "You'll be signed out of the RMS Tutor Portal on all your devices and returned to the sign-in page.",
  confirmLabel: 'Sign out',
  pendingLabel: 'Signing out…'
} as const;

interface SignOutButtonProps {
  /** Classes for the visible trigger button. */
  className?: string;
  /** Classes for the wrapping form (e.g. responsive visibility). */
  formClassName?: string;
  /** Accessible name and tooltip for icon-only triggers. */
  label?: string;
  children: React.ReactNode;
}

/**
 * Sign-out trigger with a confirmation step. Confirming submits the same native POST form to the
 * sign-out route handler as before (see lib/auth/sign-out.ts), so cookies, revocation, the CSRF check
 * and the redirect to /login are unchanged; Cancel leaves the session untouched.
 */
export function SignOutButton({ className, formClassName, label, children }: SignOutButtonProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const guardRef = React.useRef<ReturnType<typeof createSubmitGuard> | null>(null);
  if (!guardRef.current) guardRef.current = createSubmitGuard();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // A page restored from the back/forward cache would otherwise stay stuck on "Signing out…".
  React.useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      guardRef.current?.reset();
      setSubmitting(false);
      setOpen(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const handleConfirm = () => {
    guardRef.current?.trySubmit(() => {
      setSubmitting(true);
      submitForm(formRef.current);
    });
  };

  return (
    <>
      <form ref={formRef} action={SIGN_OUT_PATH} method="post" className={formClassName}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={className}
          aria-haspopup="dialog"
          aria-label={label}
          title={label}
        >
          {children}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={SIGN_OUT_DIALOG_COPY.title}
        description={SIGN_OUT_DIALOG_COPY.description}
        confirmLabel={SIGN_OUT_DIALOG_COPY.confirmLabel}
        pendingLabel={SIGN_OUT_DIALOG_COPY.pendingLabel}
        pending={submitting}
        onConfirm={handleConfirm}
      />
    </>
  );
}
