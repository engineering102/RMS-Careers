'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Maximize2, Minimize2, Presentation, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DriveFileKind } from '@/lib/content/drive-url';

interface DriveDocumentViewerProps {
  title: string;
  kind: DriveFileKind;
  embedUrl: string;
  /** The link the admin pasted; opened as-is for "Open in new tab". */
  sourceUrl: string;
}

const KIND_LABEL: Record<DriveFileKind, string> = {
  file: 'Notes / Document',
  document: 'Google Doc',
  presentation: 'Slide Deck',
  spreadsheet: 'Spreadsheet'
};

const KIND_ICON = { file: FileText, document: FileText, presentation: Presentation, spreadsheet: Sheet };

// Google's preview page renders inside the iframe (cross-origin, so its own toolbar can't be restyled);
// everything around it — header, frame, loading state, fallback hint — follows the portal theme.
export function DriveDocumentViewer({ title, kind, embedUrl, sourceUrl }: DriveDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const Icon = KIND_ICON[kind];

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen?.().catch(() => {
        // Fullscreen unsupported (e.g. iOS Safari); the new-tab button remains available.
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2 text-cyan-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h3>
            <p className="text-xs text-muted-foreground">{KIND_LABEL[kind]}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleFullscreen}
            className="hidden gap-1.5 border-input bg-secondary/80 text-xs text-foreground hover:bg-accent sm:inline-flex"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 border-input bg-secondary/80 text-xs text-foreground hover:bg-accent"
          >
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in a new tab">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New tab</span>
            </a>
          </Button>
        </div>
      </div>

      <div
        className={`relative w-full bg-muted/30 ${isFullscreen ? 'flex-1' : 'h-[70vh] min-h-[420px] sm:h-[80vh]'}`}
        aria-busy={!loaded}
      >
        {!loaded && (
          <div className="absolute inset-0 flex flex-col gap-3 p-6" role="status">
            <span className="sr-only">Loading document…</span>
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-full w-full" />
          </div>
        )}
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="fullscreen"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {!isFullscreen && (
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
          Seeing a Google sign-in or “request access” screen? The file isn’t shared publicly yet — use{' '}
          <span className="font-medium text-foreground/80">New tab</span> or let your instructor know.
        </p>
      )}
    </div>
  );
}
