import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, BookOpen, Layers, Code2, ExternalLink, Mail, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/70 text-card-foreground mt-auto relative z-10" id="contact">
      <div className="container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Identity & Core Mission */}
          <div className="space-y-4 lg:col-span-2">
            <Link href="/#home" className="flex items-center gap-3 group">
              <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border shadow-sm group-hover:border-primary/50 transition-colors">
                <Image
                  src="/rms-logo.jpg"
                  alt="RMS Careers Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors">
                RMS Careers
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Technical career education platform bridging academic foundations and industry engineering standards through structured curricula, deliberate pattern-based practice, and institutional partnerships.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Independent Platform Surfaces</span>
            </div>
          </div>

          {/* Platform Exploration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Exploration
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/#programs" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Public Programs
                </Link>
              </li>
              <li>
                <Link href="/learn" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  Starter DSA Sheets
                </Link>
              </li>
              <li>
                <Link href="/curriculum" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Curriculum Tracks
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-foreground transition-colors">
                  About & Standards
                </Link>
              </li>
            </ul>
          </div>

          {/* Dedicated Portals */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Portals
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://student.rmscareers.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center justify-between group"
                >
                  <span>Student Portal</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://tutor.rmscareers.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center justify-between group"
                >
                  <span>Tutor Portal</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://admin.rmscareers.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center justify-between group"
                >
                  <span>Admin Control Plane</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Inquiries */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Inquiries
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">College Partnerships</div>
                  <a href="mailto:partnerships@rmscareers.com" className="hover:text-primary transition-colors">
                    partnerships@rmscareers.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Admissions & Support</div>
                  <a href="mailto:admissions@rmscareers.com" className="hover:text-primary transition-colors">
                    admissions@rmscareers.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Integrity & Data Policy Summary */}
        <div className="border-t border-border mt-10 pt-6">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <span className="font-semibold text-foreground">Platform Data Architecture:</span>
              <p className="leading-relaxed">
                Freemium starter DSA sheets execute locally in browser storage with zero tracking cookies or database writes. Enrolled student cohorts access authenticated progression, verified evaluations, and institutional analytics.
              </p>
            </div>
            <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-background border border-border shrink-0">
              rmscareers.com
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} RMS Careers. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Public Website Surface — Built with Next.js & Server-Authoritative Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
