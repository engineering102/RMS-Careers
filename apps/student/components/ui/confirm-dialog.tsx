'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from './button';

export type ConfirmDialogVariant = 'default' | 'destructive';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** What will happen, in plain words. Announced as the dialog description. */
  description?: React.ReactNode;
  /** Optional extra detail rendered between the description and the buttons. */
  children?: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /**
   * Runs the action. The dialog never closes itself: call onOpenChange(false) when the action
   * succeeds, so a failure can leave it open. A returned promise shows the pending state until it settles.
   */
  onConfirm: () => void | Promise<unknown>;
  /** Controlled pending state, for callers that track it themselves (e.g. useTransition). */
  pending?: boolean;
}

/** Destructive confirmations start on Cancel so Enter does not trigger the irreversible action. */
export function initialFocusTarget(variant: ConfirmDialogVariant): 'cancel' | 'confirm' {
  return variant === 'destructive' ? 'cancel' : 'confirm';
}

/**
 * Accessible confirmation (role="alertdialog") built on the Radix dialog already used by the app:
 * focus is trapped, Escape and Cancel return to the page, and nothing can dismiss it while pending.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  pendingLabel = 'Working…',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  pending
}: ConfirmDialogProps) {
  const [internalPending, setInternalPending] = React.useState(false);
  const isPending = pending ?? internalPending;
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (isPending && !next) return;
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    const result = onConfirm();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setInternalPending(true);
      try {
        await result;
      } finally {
        setInternalPending(false);
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          role="alertdialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (initialFocusTarget(variant) === 'cancel' ? cancelRef : confirmRef).current?.focus();
          }}
          onPointerDownOutside={(event) => {
            if (isPending) event.preventDefault();
          }}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-card p-6 text-card-foreground shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="space-y-2">
            <DialogPrimitive.Title className="text-lg font-semibold leading-tight tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>

          {children}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              type="button"
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              disabled={isPending}
              aria-busy={isPending || undefined}
              onClick={handleConfirm}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {pendingLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
