import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Users } from 'lucide-react';

import { Alert, AlertTitle, alertRoleFor } from '@/components/ui/alert';
import { ConfirmDialog, initialFocusTarget } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Textarea } from '@/components/ui/textarea';

// Admin unit tests are .ts (vitest only collects *.test.ts here), so elements are built with createElement.
const h = React.createElement;
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('UI primitives (Phase 1.2)', () => {
  it('Alert maps variants to live-region roles', () => {
    expect(alertRoleFor('destructive')).toBe('alert');
    expect(alertRoleFor('warning')).toBe('alert');
    expect(alertRoleFor('success')).toBe('status');
    expect(alertRoleFor('info')).toBe('status');

    const markup = html(h(Alert, { variant: 'success' }, h(AlertTitle, null, 'Program created')));
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Program created');
  });

  it('ConfirmDialog starts destructive confirmations on Cancel and renders nothing while closed', () => {
    expect(initialFocusTarget('destructive')).toBe('cancel');
    expect(initialFocusTarget('default')).toBe('confirm');
    const closed = html(
      h(ConfirmDialog, { open: false, onOpenChange: () => {}, title: 'Archive program?', onConfirm: () => {} })
    );
    expect(closed).not.toContain('Archive program?');
  });

  it('Label and Textarea associate by id', () => {
    const markup = html(
      h('div', null, h(Label, { htmlFor: 'description' }, 'Description'), h(Textarea, { id: 'description', name: 'description' }))
    );
    expect(markup).toContain('for="description"');
    expect(markup).toContain('id="description"');
    expect(markup).toContain('name="description"');
  });

  it('PageHeader, StatCard and Skeleton render their content', () => {
    expect(html(h(PageHeader, { title: 'Programs', actions: h('button', { type: 'button' }, 'New Program') }))).toContain(
      'New Program'
    );
    const stat = html(h(StatCard, { label: 'Active members', value: 0, hint: 'In this batch', icon: Users }));
    expect(stat).toContain('Active members');
    expect(stat).toContain('In this batch');
    expect(html(h(Skeleton))).toContain('aria-hidden="true"');
  });
});
