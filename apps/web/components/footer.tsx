import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, BookOpen, Layers, Code2, ExternalLink, Mail, ArrowUpRight, Building2, GraduationCap, Users2, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/70 text-card-foreground mt-auto relative z-10" id="contact">
      <div className="container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-8">
          {/* Identity & Core Mission (spans 2 cols on lg) */}
          <div className="col-span-2 space-y-4">
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
              End-to-end career readiness platform helping B.Tech engineering students build technical skills, real projects, and professional interview readiness through structured institutional partnerships.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Independent Application Surfaces</span>
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/programs" className="hover:text-foreground transition-colors">
                  Programs
                </Link>
              </li>
              <li>
                <Link href="/#approach" className="hover:text-foreground transition-colors">
                  The RMS Approach
                </Link>
              </li>
              <li>
                <Link href="/#delivery-model" className="hover:text-foreground transition-colors">
                  6-Month Delivery Model
                </Link>
              </li>
              <li>
                <Link href="/#student-experience" className="hover:text-foreground transition-colors">
                  Student Experience
                </Link>
              </li>
              <li>
                <Link href="/#classroom-experience" className="hover:text-foreground transition-colors">
                  Built From Classrooms
                </Link>
              </li>
              <li>
                <Link href="/#in-action" className="hover:text-foreground transition-colors">
                  RMS in Action
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals: Student & Tutor & Admin */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Portals
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://student.rms-careers.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center justify-between group"
                >
                  <span>Student Login</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <Link href="/learn" className="hover:text-foreground transition-colors">
                  Guest Learning
                </Link>
              </li>
              <li>
                <a
                  href="https://tutor.rms-careers.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center justify-between group"
                >
                  <span>Tutor Login</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://admin.rms-careers.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors flex items-center justify-between group"
                >
                  <span>Admin Portal</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/#classroom-experience" className="hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/#partner" className="hover:text-foreground transition-colors">
                  Institutions
                </Link>
              </li>
              <li>
                <Link href="/#partner" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/#partner" className="hover:text-foreground transition-colors font-medium text-primary">
                  Partner With RMS
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Legal
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                  Terms & Conditions
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                  Refund & Cancellation Policy
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                  Cookie Policy
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer">
                  Disclaimer
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform Integrity & Canonical Domain Notice */}
        <div className="border-t border-border mt-10 pt-6">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <span className="font-semibold text-foreground">Canonical Domain & Architectural Invariant:</span>
              <p className="leading-relaxed">
                RMS Careers maintains complete surface separation across the public corporate website and authenticated portals. Public starter DSA practice operates purely in client-side storage without authentication or database persistence.
              </p>
            </div>
            <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-background border border-border shrink-0">
              www.rms-careers.com
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
