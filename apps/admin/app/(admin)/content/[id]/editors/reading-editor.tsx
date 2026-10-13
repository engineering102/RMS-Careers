'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from './field';
import type { EditorProps } from './editor-props';

/**
 * Reading and resource items store the same fields and render with the same student viewer.
 * Readings lead with notes; resources lead with the link.
 */
export function ReadingEditor({ item, form, set, errorFor }: EditorProps) {
  const linkField = (
    <Field
      key="link"
      id="resourceLink"
      label="Document link"
      hint="Google Docs, Drive, Notion, GitHub, slides, a PDF… Students get an “Open Resource” button."
      error={errorFor('resourceLink')}
    >
      <Input
        id="resourceLink"
        value={form.resourceLink}
        onChange={(e) => set('resourceLink', e.target.value)}
        placeholder="https://"
      />
    </Field>
  );
  const notesField = (
    <Field
      key="notes"
      id="notes"
      label="Notes"
      hint="Shown as plain text. Line breaks and indentation are kept as you type them."
      error={errorFor('notes')}
      counter={`${form.notes.length.toLocaleString('en-IN')} characters`}
    >
      <Textarea
        id="notes"
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        rows={item.contentType === 'notes' ? 16 : 6}
        className="font-mono text-sm leading-relaxed"
        placeholder={'Key ideas\n- …\n\nWorked example\n…'}
      />
    </Field>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{item.contentType === 'notes' ? 'Reading material' : 'Resource'}</CardTitle>
        <CardDescription>Add a link to a document, written notes, or both. Files are linked, not uploaded.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {item.contentType === 'notes' ? [notesField, linkField] : [linkField, notesField]}
      </CardContent>
    </Card>
  );
}
