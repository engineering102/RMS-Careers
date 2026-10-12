import React from 'react';
import { FileText, ExternalLink, Download, Bookmark, FileCode, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ResourceMetadata } from '@/lib/types/content';

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

  return (
    <div className="space-y-6">
      {/* Resource Download / Access Card */}
      {documentUrl ? (
        <Card className="border-border bg-card/60 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  {isPdf ? (
                    <FileText className="h-6 w-6" />
                  ) : (
                    <Bookmark className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isPdf ? 'PDF Document / Slide Deck' : 'External Learning Resource'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-sm"
                >
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                    <span>Open Resource</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {isPdf && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-input bg-secondary/80 hover:bg-accent text-foreground text-xs gap-1.5"
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
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <FileCode className="h-3.5 w-3.5" />
              <span>Study Notes & Reference</span>
            </div>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
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
            <h4 className="text-sm font-semibold text-foreground/80">Resource Information</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {description || 'This resource contains learning materials aligned with your program syllabus.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
