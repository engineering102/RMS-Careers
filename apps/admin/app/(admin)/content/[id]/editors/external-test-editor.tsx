'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from './field';
import type { EditorProps } from './editor-props';

/**
 * A test hosted on an external platform. Students see it under Assessments with a button that opens the
 * link; scores come back through the batch's External assessments import, matched by the assessment code.
 */
export function ExternalTestEditor({ form, set, errorFor }: EditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">External test</CardTitle>
        <CardDescription>
          Students open this link to sit the test on the other platform. Schedule it per batch in the curriculum
          (available from / due), matching the test window on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          id="externalUrl"
          label="Test link"
          hint="The candidate link from the platform, e.g. https://rms-careers.qwiktest.in/assessment-1. Must be https."
          error={errorFor('externalUrl')}
        >
          <Input
            id="externalUrl"
            value={form.externalUrl}
            onChange={(e) => set('externalUrl', e.target.value)}
            placeholder="https://"
            inputMode="url"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="externalProvider" label="Platform" hint="Shown to students." error={errorFor('externalProvider')}>
            <Input
              id="externalProvider"
              value={form.externalProvider}
              onChange={(e) => set('externalProvider', e.target.value)}
              placeholder="QwikTest"
            />
          </Field>
          <Field
            id="assessmentCode"
            label="Assessment code"
            hint="Use the same code when importing results, so students see their score on this card."
            error={errorFor('assessmentCode')}
          >
            <Input
              id="assessmentCode"
              value={form.assessmentCode}
              onChange={(e) => set('assessmentCode', e.target.value)}
              placeholder="QT-CSE26-20261025-aptitude"
              className="font-mono text-sm"
            />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
