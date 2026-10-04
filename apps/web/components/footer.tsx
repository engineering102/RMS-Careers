import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, BookOpen, Layers, Code2, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 text-card-foreground mt-auto">
      <div className="container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Identity */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border">
                <Image
                  src="/rms-logo.jpg"
                  alt="RMS Careers Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-lg text-foreground tracking-tight">
                RMS Careers
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Technical career education platform bridging academic foundations and industry engineering standards through structured programs, rigorous practice, and institutional partnerships.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Independent Platform Surfaces</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Exploration
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Overview & Philosophy
                </Link>
              </li>
              <li>
                <Link href="/programs" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Public Programs
                </Link>
              </li>
              <li>
                <Link href="/curriculum" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Structured Tracks
                </Link>
              </li>
              <li>
                <Link href="/learn" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  Starter DSA Sheets
                </Link>
              </li>
            </ul>
          </div>

          {/* Portal Gateways */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Portals
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors flex items-center gap-1">
                  Student Portal Gateway
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors flex items-center gap-1">
                  Tutor Portal Gateway
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors flex items-center gap-1">
                  Admin Control Plane
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Integrity */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Platform Integrity
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Freemium starter DSA sheets are executed locally in browser storage with zero telemetry or unauthenticated database writes. Enrolled student cohorts access authenticated progression, code evaluations, and institutional leaderboards.
            </p>
            <div className="pt-2">
              <span className="text-xs text-muted-foreground font-mono">
                rmscareers.com
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} RMS Careers. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Public Website Surface — Built with Next.js & Server-Authoritative Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
