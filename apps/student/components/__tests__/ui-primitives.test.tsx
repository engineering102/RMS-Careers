import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Users } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle, alertRoleFor } from '../ui/alert';
import { ConfirmDialog, initialFocusTarget } from '../ui/confirm-dialog';
import { EmptyState } from '../ui/empty-state';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PageHeader } from '../ui/page-header';
import { Skeleton } from '../ui/skeleton';
import { StatCard } from '../ui/stat-card';
import { Textarea } from '../ui/textarea';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('UI primitives (Phase 1.2)', () => {
  it('Alert announces problems assertively and everything else politely', () => {
    expect(alertRoleFor('destructive')).toBe('alert');
    expect(alertRoleFor('warning')).toBe('alert');
    expect(alertRoleFor('success')).toBe('status');
    expect(alertRoleFor('info')).toBe('status');
    expect(alertRoleFor(undefined)).toBe('status');

    const markup = html(
      <Alert variant="destructive">
        <AlertTitle>Sign-in failed</AlertTitle>
        <AlertDescription>Check your email and password.</AlertDescription>
      </Alert>
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('border-destructive/50');
    expect(markup).toContain('Sign-in failed');
  });

  it('Alert accepts an explicit role override', () => {
    expect(html(<Alert variant="success" role="note">Saved</Alert>)).toContain('role="note"');
  });

  it('ConfirmDialog focuses Cancel first for destructive actions and renders nothing while closed', () => {
    expect(initialFocusTarget('destructive')).toBe('cancel');
    expect(initialFocusTarget('default')).toBe('confirm');

    const closed = html(
      <ConfirmDialog open={false} onOpenChange={() => {}} title="Archive program?" onConfirm={() => {}} />
    );
    expect(closed).not.toContain('Archive program?');
  });

  it('Label, Input and Textarea associate and use token styling', () => {
    const markup = html(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" name="email" aria-invalid="true" />
        <Textarea id="notes" name="notes" />
      </div>
    );
    expect(markup).toContain('for="email"');
    expect(markup).toContain('id="email"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('focus-visible:ring-ring');
    expect(markup).toContain('<textarea');
  });

  it('PageHeader renders the requested heading level, actions and leading slot', () => {
    const page = html(
      <PageHeader
        title="Batches"
        description="Manage cohorts"
        eyebrow="Admin"
        leading={<a href="/back">Back</a>}
        actions={<button type="button">Create</button>}
      />
    );
    expect(page).toContain('<h1');
    expect(page).toContain('Manage cohorts');
    expect(page).toContain('href="/back"');
    expect(page).toContain('Create');

    expect(html(<PageHeader title="Section" level={2} />)).toContain('<h2');
  });

  it('StatCard shows label, value and hint, and hides its icon from assistive tech', () => {
    const markup = html(<StatCard label="Pending registrations" value={2} hint="Awaiting batch" icon={Users} tone="warning" />);
    expect(markup).toContain('Pending registrations');
    expect(markup).toContain('>2<');
    expect(markup).toContain('Awaiting batch');
    expect(markup).toContain('bg-warning/10');
    expect(markup).toContain('aria-hidden="true"');
  });

  it('Skeleton is decorative and EmptyState renders its action', () => {
    expect(html(<Skeleton className="h-4 w-20" />)).toContain('aria-hidden="true"');
    const empty = html(<EmptyState title="No content yet" description="Nothing here" action={<a href="/new">Add</a>} />);
    expect(empty).toContain('No content yet');
    expect(empty).toContain('href="/new"');
  });
});
