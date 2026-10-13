'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseVideoUrl } from '@/lib/content/video-url';
import { Field } from './field';
import type { EditorProps } from './editor-props';

const PROVIDER_NAMES = { youtube: 'YouTube', vimeo: 'Vimeo', custom: 'Custom player' } as const;

export function LectureEditor({ form, set, errorFor }: EditorProps) {
  const parsed = form.videoUrl.trim() ? parseVideoUrl(form.videoUrl) : null;
  const hint = parsed
    ? `${PROVIDER_NAMES[parsed.provider]}${parsed.provider === 'custom' ? '' : ` · video ${parsed.videoId}`}`
    : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Video</CardTitle>
        <CardDescription>
          Paste a YouTube or Vimeo link (any format: watch, share, shorts, embed). Other players need an https embed
          URL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field id="videoUrl" label="Video link" hint={hint} error={errorFor('videoUrl')}>
          <Input
            id="videoUrl"
            value={form.videoUrl}
            onChange={(e) => set('videoUrl', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
      </CardContent>
    </Card>
  );
}
