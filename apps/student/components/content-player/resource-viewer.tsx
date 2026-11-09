import React from 'react';
import { FileText, ExternalLink, Download, Bookmark, FileCode, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ResourceMetadata } from '@/lib/types/content';
import { parseDriveUrl } from '@/lib/content/drive-url';
import { DriveDocumentViewer } from './drive-document-viewer';

interface ResourceViewerProps {
  title: string;
  description: string | null;
  resourceMetadata: ResourceMetadata | null;
}

export function ResourceViewer({
  title,
  description,
  resourceMetadata
}: ResourceViewerProps) {
  const documentUrl = resourceMetadata?.documentUrl;
  const notes = resourceMetadata?.notes;
  const isPdf = documentUrl?.toLowerCase().endsWith('.pdf');
  const driveLink = parseDriveUrl(documentUrl);

  return (
    <div className="space-y-6">
      {/* Drive / Docs links open in the in-page viewer; anything else keeps the access card */}
      {documentUrl && driveLink ? (
        <DriveDocumentViewer
          title={title}
          kind={driveLink.kind}
          embedUrl={driveLink.embedUrl}
          sourceUrl={documentUrl}
        />
      ) : documentUrl ? (
        <Card className="border-border bg-card/60 overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="shrink-0 rounded-md border border-border bg-muted p-2.5 text-muted-foreground">
                  {isPdf ? (
                    <FileText className="h-6 w-6" />
                  ) : (
                    <Bookmark className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPdf ? 'PDF or slides' : 'External resource'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <Button
                  asChild
                  size="sm"
                >
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                    <span>Open</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {isPdf && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                  >
                    <a href={documentUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Notes / Supplementary Reading Content */}
      {notes && (
        <Card className="border-border bg-card/40">
          <CardContent className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <FileCode className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span>Notes</span>
            </div>
            <div className="max-w-[70ch] whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-foreground">
              {notes}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State if neither documentUrl nor notes exist */}
      {!documentUrl && !notes && (
        <Card className="border-border bg-card/40">
          <CardContent className="p-8 text-center space-y-2">
            <Bookmark className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-semibold text-foreground">About this resource</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {description || 'This resource contains learning materials aligned with your program syllabus.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
