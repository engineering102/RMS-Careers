import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ContentTypeTag } from '@/components/ui/content-type-tag';
import type { ContentType } from '@/lib/types/library';
import type { RelatedBatchContext } from '@/lib/types/content';

interface ContentHeaderProps {
  title: string;
  contentType: ContentType;
  programCode: string;
  topic?: string;
  durationMinutes?: number;
  relatedBatchContext?: RelatedBatchContext | null;
  batchId?: string;
}

export function ContentHeader({
  title,
  contentType,
  programCode,
  topic,
  durationMinutes,
  relatedBatchContext,
  batchId
}: ContentHeaderProps) {

  const backHref = batchId
    ? `/batches/${batchId}`
    : relatedBatchContext?.batchId
      ? `/batches/${relatedBatchContext.batchId}`
      : '/library';

  const backLabel = batchId || relatedBatchContext ? relatedBatchContext?.batchName || 'Curriculum' : 'Library';

  return (
    <header className="space-y-4">
      <Link
        href={backHref}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="space-y-2">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <ContentTypeTag type={contentType} />
          {topic && <span>{topic}</span>}
          {durationMinutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {durationMinutes} min
            </span>
          ) : null}
        </p>
        <h1 className="text-balance font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.75rem]">
          {title}
        </h1>
      </div>
    </header>
  );
}
