'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Code2, BookOpen, Layers, LogIn, ArrowRight } from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1">
          <div className="relative h-9 w-9 overflow-hidden rounded-md border border-border shadow-sm">
            <Image
              src="/rms-logo.jpg"
              alt="RMS Careers Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
              RMS Careers
            </span>
            <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground">
              Technical Academy
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Main Navigation">
          <Link
            href="/"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Home
          </Link>
          <Link
            href="/programs"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            Programs
          </Link>
          <Link
            href="/curriculum"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Curriculum
          </Link>
          <Link
            href="/learn"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Code2 className="h-4 w-4 text-primary" />
            Practice DSA
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Free
            </span>
          </Link>
        </nav>

        {/* Gateway CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogIn className="h-4 w-4" />
            <span>Portal Login</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-3 pb-6 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-muted"
          >
            Home
          </Link>
          <Link
            href="/programs"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-muted"
          >
            Programs
          </Link>
          <Link
            href="/curriculum"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-muted"
          >
            Curriculum
          </Link>
          <Link
            href="/learn"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-muted"
          >
            Practice DSA (Starter Sheets)
          </Link>
          <div className="pt-3 border-t border-border">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
            >
              <LogIn className="h-4 w-4" />
              <span>Portal Login Gateway</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
