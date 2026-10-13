// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CARRY_OVER_WINDOW_MS, ConfirmDialog, isCarriedOverActivation } from '@/components/ui/confirm-dialog';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('isCarriedOverActivation', () => {
  const base = { detail: 0, keyPressedInside: false, openingKeyHeld: false, msSinceOpen: 5 };

  it('ignores a keyboard click right after opening with no key pressed inside', () => {
    expect(isCarriedOverActivation(base)).toBe(true);
  });

  it('accepts mouse clicks, fresh key presses inside, and later assistive-technology clicks', () => {
    expect(isCarriedOverActivation({ ...base, detail: 1 })).toBe(false);
    expect(isCarriedOverActivation({ ...base, keyPressedInside: true })).toBe(false);
    expect(isCarriedOverActivation({ ...base, msSinceOpen: CARRY_OVER_WINDOW_MS + 1 })).toBe(false);
  });

  it('keeps ignoring keyboard clicks while the opening key auto-repeats', () => {
    expect(isCarriedOverActivation({ ...base, openingKeyHeld: true, msSinceOpen: 2_000 })).toBe(true);
  });
});

/**
 * Reproduces Radix Select / DropdownMenu: the dialog opens during a keydown on another element, then
 * the browser's Enter activation (a click with detail 0) lands on whichever dialog button has focus.
 */
function Harness({
  variant,
  onConfirm,
  onCancel
}: {
  variant: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div
        role="option"
        aria-selected="false"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter') setOpen(true);
        }}
      >
        Archived
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onCancel();
          setOpen(next);
        }}
        title="Archive program?"
        confirmLabel="Archive"
        variant={variant}
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}

function openViaKeydown(variant: 'default' | 'destructive') {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<Harness variant={variant} onConfirm={onConfirm} onCancel={onCancel} />);
  const option = screen.getByRole('option');
  option.focus();
  act(() => {
    fireEvent.keyDown(option, { key: 'Enter' });
  });
  return { onConfirm, onCancel };
}

describe('ConfirmDialog ignores the activation carried over from the opening key press', () => {
  it('default variant: the carried-over click does not confirm', () => {
    const { onConfirm } = openViaKeydown('default');
    const confirm = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' });
    expect(document.activeElement).toBe(confirm);

    fireEvent.click(confirm, { detail: 0 });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('destructive variant: the carried-over click does not cancel', () => {
    const { onCancel } = openViaKeydown('destructive');
    const cancel = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' });
    expect(document.activeElement).toBe(cancel);

    fireEvent.click(cancel, { detail: 0 });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('auto-repeat of the held opening key does not confirm, even after the window', () => {
    vi.useFakeTimers();
    const { onConfirm } = openViaKeydown('default');
    const confirm = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.keyDown(confirm, { key: 'Enter', repeat: true });
    fireEvent.click(confirm, { detail: 0 });
    expect(onConfirm).not.toHaveBeenCalled();

    // Releasing the key and pressing it again is a deliberate confirm.
    fireEvent.keyUp(confirm, { key: 'Enter' });
    fireEvent.keyDown(confirm, { key: 'Enter' });
    fireEvent.click(confirm, { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('a fresh Enter on the focused button confirms', async () => {
    const user = userEvent.setup();
    const { onConfirm } = openViaKeydown('default');
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('a mouse click works immediately', () => {
    const { onConfirm } = openViaKeydown('default');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }), { detail: 1 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('a keyboard-style click after the window (e.g. a screen reader) works', () => {
    const { onConfirm } = openViaKeydown('default');
    const later = performance.now() + CARRY_OVER_WINDOW_MS + 50;
    vi.spyOn(performance, 'now').mockReturnValue(later);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }), { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
