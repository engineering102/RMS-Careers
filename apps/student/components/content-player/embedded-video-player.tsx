'use client';

import React, { useState, useEffect } from 'react';
import { Video, AlertCircle, PlayCircle, RotateCcw } from 'lucide-react';
import type { VideoMetadata } from '@/lib/types/content';

interface EmbeddedVideoPlayerProps {
  contentItemId: string;
  videoMetadata: VideoMetadata | null;
  onEnded?: () => void;
}

export function EmbeddedVideoPlayer({
  contentItemId,
  videoMetadata,
  onEnded
}: EmbeddedVideoPlayerProps) {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  const storageKey = `rms_video_pos_${contentItemId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const seconds = parseInt(stored, 10);
        if (!isNaN(seconds) && seconds > 10) {
          setSavedPosition(seconds);
          setShowResumeBanner(true);
        }
      }
    } catch {
      // LocalStorage might be disabled or unavailable
    }
  }, [storageKey]);

  if (!videoMetadata || !videoMetadata.videoId) {
    return (
      <div className="w-full aspect-video rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <AlertCircle className="h-10 w-10 text-amber-400/80 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">Video Source Unavailable</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          This lecture does not have an attached video stream or the video is currently being processed.
        </p>
      </div>
    );
  }

  const { provider, videoId, aspectRatio } = videoMetadata;
  const isFourThree = aspectRatio === '4:3';

  let embedUrl = '';
  if (provider === 'vimeo') {
    // Vimeo standard responsive embed
    embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=0&title=0&byline=0&portrait=0&badge=0`;
  } else if (provider === 'youtube') {
    // Privacy-enhanced YouTube embed
    embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  } else {
    // Fallback embed URL or custom provider
    embedUrl = videoId.startsWith('http')
      ? videoId
      : `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const clearSavedPosition = () => {
    try {
      localStorage.removeItem(storageKey);
      setShowResumeBanner(false);
      setSavedPosition(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3">
      {/* Resume playback banner if last position was saved */}
      {showResumeBanner && savedPosition && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              You previously paused at <strong>{formatTime(savedPosition)}</strong>.
            </span>
          </div>
          <button
            onClick={clearSavedPosition}
            className="flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-100 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Dismiss
          </button>
        </div>
      )}

      {/* Responsive Aspect Ratio Player Container */}
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl ${
          isFourThree ? 'aspect-[4/3]' : 'aspect-video'
        }`}
      >
        <iframe
          src={embedUrl}
          title="Video Player"
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
