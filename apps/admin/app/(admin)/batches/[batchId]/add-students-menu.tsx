'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, Copy, ExternalLink, FileSpreadsheet, Link2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { enrollmentLinkPath, type EnrollmentLinkAvailability } from '@/lib/enrollment/link-availability';
import { AddStudentDialog } from './add-student-dialog';

export interface AddStudentsMenuProps {
  batchId: string;
  batchName: string;
  program: { name: string; code: string };
  collegeLabel: string;
  linkAvailability: EnrollmentLinkAvailability;
}

/** Copies text, falling back to selecting it in `input` and execCommand when the Clipboard API is unavailable. */
export async function copyText(text: string, input: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection fallback (e.g. permission denied).
  }
  if (!input) return false;
  input.focus();
  input.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

/**
 * Single "Add students" entry point on a batch: add one student, bulk import into this batch, or share
 * the enrollment link.
 */
export function AddStudentsMenu({ batchId, batchName, program, collegeLabel, linkAvailability }: AddStudentsMenuProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const linkInputRef = React.useRef<HTMLInputElement>(null);
  // Dialogs open once the menu has closed, so the two focus scopes do not fight (see user-menu.tsx).
  const dialogAfterClose = React.useRef<'add' | 'share' | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [origin, setOrigin] = React.useState('');

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const linkPath = enrollmentLinkPath(program.code);
  const link = `${origin}${linkPath}`;

  const handleCopy = async () => {
    if (await copyText(link, linkInputRef.current)) {
      toast.success('Enrollment link copied');
    } else {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} size="sm" className="h-9 gap-1.5">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add students
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64"
          onCloseAutoFocus={(event) => {
            const pending = dialogAfterClose.current;
            if (!pending) return;
            dialogAfterClose.current = null;
            event.preventDefault();
            triggerRef.current?.focus();
            if (pending === 'add') setAddOpen(true);
            else setShareOpen(true);
          }}
        >
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              dialogAfterClose.current = 'add';
            }}
          >
            <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Add a student
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/enrollments/import?batch=${encodeURIComponent(batchId)}`} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Import from CSV or Excel
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => {
              dialogAfterClose.current = 'share';
            }}
          >
            <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Share enrollment link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        batchId={batchId}
        batchName={batchName}
        programLabel={`${program.name} (${program.code})`}
        collegeLabel={collegeLabel}
        returnFocusRef={triggerRef}
      />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Share enrollment link</DialogTitle>
            <DialogDescription>
              Students register themselves through the public form for {program.name} ({program.code}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enrollment-link">Enrollment link</Label>
              <div className="flex gap-2">
                <Input
                  id="enrollment-link"
                  ref={linkInputRef}
                  readOnly
                  value={link}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy
                </Button>
              </div>
            </div>

            <Alert variant="info">
              <AlertTitle>This link is for the program, not this batch</AlertTitle>
              <AlertDescription>
                Registrations go to <strong>{program.name}</strong>, not to <strong>{batchName}</strong>. They
                arrive on Enrollments as <strong>Pending with no batch</strong>, and students get portal access
                only after an admin confirms them.
              </AlertDescription>
            </Alert>

            {!linkAvailability.accepting && linkAvailability.reason ? (
              <Alert variant="warning">
                <AlertTitle>The form is not accepting registrations</AlertTitle>
                <AlertDescription>{linkAvailability.reason}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button asChild variant="ghost">
              <a href={linkPath} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open form
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
            <Button type="button" onClick={() => setShareOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
