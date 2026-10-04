import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { announcementContent } from '@/lib/data/homepage-content';

export function AnnouncementBar() {
  if (!announcementContent.enabled) {
    return null;
  }

  return (
    <aside
      aria-label="Announcement"
      className="relative z-50 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white text-xs py-2 px-4 shadow-sm"
    >
      <div className="container mx-auto flex items-center justify-center gap-2 sm:gap-3 text-center flex-wrap">
        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-white/20 text-[10px] uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          <span>{announcementContent.badge}</span>
        </span>
        <span className="font-medium text-white/95">
          {announcementContent.headline}
        </span>
        <Link
          href={announcementContent.ctaHref}
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:text-white/80 transition-colors ml-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
        >
          <span>{announcementContent.ctaLabel}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
