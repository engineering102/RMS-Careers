// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CARRY_OVER_WINDOW_MS, ConfirmDialog, isCarriedOverActivation, returnFocusTarget } from '@/components/ui/confirm-dialog';

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

function PopupHarness() {
  // Like Radix Select (observed in the browser): choosing an option closes the Select at once, so the
  // trigger drops aria-controls, but the popup DOM is still mounted when the dialog takes focus.
  const [expanded, setExpanded] = React.useState(true);
  const [popupOpen, setPopupOpen] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  return (
    <>
      {/* Like Radix Select: aria-controls is only set while the popup is open. */}
      <button
        type="button"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={expanded ? 'status-popup' : undefined}
      >
        Active
      </button>
      {popupOpen ? (
        <div role="listbox" id="status-popup">
          <div
            role="option"
            aria-selected="false"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              setExpanded(false);
              setDialogOpen(true);
            }}
            // Like Radix Select (observed in the browser): the dialog takes focus while the option is
            // still mounted, and the popup unmounts after focus has left it.
            onBlur={() => setPopupOpen(false)}
          >
            Archived
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Archive program?"
        variant="destructive"
        onConfirm={() => setDialogOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog focus return', () => {
  it('opened from a popup option, it returns focus to the popup trigger (the option is gone)', async () => {
    const user = userEvent.setup();
    render(<PopupHarness />);
    // The trigger has focus before the popup's option does, as when a Select is opened.
    screen.getByRole('combobox').focus();
    const option = screen.getByRole('option');
    option.focus();
    act(() => {
      fireEvent.keyDown(option, { key: 'Enter' });
    });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByRole('alertdialog')).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
  });

  it('returnFocusTarget keeps ordinary elements and maps popup items to their trigger', () => {
    render(
      <>
        <button type="button" aria-controls="menu-1">More</button>
        <div role="menu" id="menu-1">
          <div role="menuitem" tabIndex={-1}>Resend</div>
        </div>
        <button type="button">Plain</button>
      </>
    );
    expect(returnFocusTarget(screen.getByRole('menuitem'))).toBe(screen.getByRole('button', { name: 'More' }));
    expect(returnFocusTarget(screen.getByRole('button', { name: 'Plain' }))).toBe(
      screen.getByRole('button', { name: 'Plain' })
    );
    expect(returnFocusTarget(null)).toBeNull();
  });

  it('when the popup no longer names its trigger, it falls back to the element focused before the popup', () => {
    render(
      <>
        <button type="button">Status</button>
        <div role="listbox" id="closed-popup">
          <div role="option" aria-selected="false" tabIndex={-1}>Archived</div>
        </div>
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Status' });
    expect(returnFocusTarget(screen.getByRole('option'), trigger)).toBe(trigger);
    // With no usable fallback, the option itself is returned.
    expect(returnFocusTarget(screen.getByRole('option'), null)).toBe(screen.getByRole('option'));
  });
});
