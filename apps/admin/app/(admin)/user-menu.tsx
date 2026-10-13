'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SignOutConfirm } from '@/components/sign-out-confirm';

interface UserMenuProps {
  user: { image: string | null } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  // Set by the Sign Out item; the dialog opens once the menu has closed, so the menu's focus
  // handling does not pull focus out of the dialog, and Cancel returns focus to the avatar button.
  const confirmAfterClose = React.useRef(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
            aria-label="Account menu"
          >
            <Image
              src={user?.image ?? '/placeholder-user.jpg'}
              width={36}
              height={36}
              alt="Avatar"
              className="overflow-hidden rounded-full"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (!confirmAfterClose.current) return;
            confirmAfterClose.current = false;
            event.preventDefault();
            triggerRef.current?.focus();
            setConfirmOpen(true);
          }}
        >
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem
              onSelect={() => {
                confirmAfterClose.current = true;
              }}
            >
              Sign Out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem>
              <Link href="/login">Sign In</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {user ? <SignOutConfirm open={confirmOpen} onOpenChange={setConfirmOpen} /> : null}
    </>
  );
}
