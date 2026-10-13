'use client';

import * as React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EditorProps } from './editor-props';

/** DSA problems live in the student portal's catalogue; this item only points students at a sheet by slug. */
export function DsaSheetEditor({ form }: EditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">DSA sheet</CardTitle>
        <CardDescription>
          Problems for DSA sheets live in the student portal&apos;s DSA catalogue and are not edited here. This item
          sends students to the sheet whose slug is{' '}
          <span className="font-mono text-foreground">{form.slug || '…'}</span>. Check the slug matches a catalogue
          sheet before publishing.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
