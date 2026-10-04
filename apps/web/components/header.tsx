'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  GraduationCap,
  Users2,
  ShieldCheck,
  ExternalLink,
  Code2
} from 'lucide-react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme from document or localStorage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  // Handle outside click to close portal dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPortalDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPortalDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('rms-theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const portalOptions = [
    {
      name: 'Student Portal',
      description: 'Enrolled cohort coursework, evaluations & streaks',
      href: 'https://student.rms-careers.com',
      icon: GraduationCap,
      badge: 'Learner'
    },
    {
      name: 'Tutor Portal',
      description: 'Milestone reviews, code feedback & batch grading',
      href: 'https://tutor.rms-careers.com',
      icon: Users2,
      badge: 'Mentor'
    },
    {
      name: 'Admin Portal',
      description: 'Institution administration, batches & rosters',
      href: 'https://admin.rms-careers.com',
      icon: ShieldCheck,
      badge: 'Control Plane'
    }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 glass transition-colors" id="home">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo - returns to homepage top */}
        <Link
          href="/#home"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
          aria-label="RMS Careers - Home"
        >
          <div className="relative h-9 w-9 overflow-hidden rounded-md border border-border shadow-sm group-hover:border-primary/50 transition-colors">
            <Image
              src="/rms-logo.jpg"
              alt="RMS Careers Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base sm:text-lg leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
              RMS Careers
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
              Technical Academy
            </span>
          </div>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Main Navigation">
          <Link
            href="/programs"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Programs
          </Link>
          <Link
            href="/learn"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Students
          </Link>
          <Link
            href="/#partner"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Institutions
          </Link>
          <Link
            href="/curriculum"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Resources
          </Link>
          <Link
            href="/#classroom-experience"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/#partner"
            className="px-3 py-2 text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Action Controls: Partner With RMS, Theme Toggle & Portal Login Dropdown */}
        <div className="hidden md:flex items-center gap-3">
          {/* Visually emphasized Partner With RMS CTA */}
          <Link
            href="/#partner"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Partner With RMS</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Portal Login Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-expanded={portalDropdownOpen}
              aria-haspopup="true"
              id="portal-login-button"
            >
              <span>Portal Login</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  portalDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {portalDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl z-50 text-foreground animate-in fade-in zoom-in-95 duration-150"
                role="menu"
                aria-labelledby="portal-login-button"
              >
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                  Select RMS Portal
                </div>
                {portalOptions.map((portal) => {
                  const Icon = portal.icon;
                  return (
                    <a
                      key={portal.name}
                      href={portal.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                      role="menuitem"
                      onClick={() => setPortalDropdownOpen(false)}
                    >
                      <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {portal.name}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug line-clamp-1">
                          {portal.description}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu and theme buttons */}
        <div className="md:hidden flex items-center gap-2">
          {/* Theme Toggle for Mobile */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700" />
            )}
          </button>

          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="space-y-1">
            <Link
              href="/programs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              Programs
            </Link>
            <Link
              href="/learn"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              Students
            </Link>
            <Link
              href="/#partner"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              Institutions
            </Link>
            <Link
              href="/curriculum"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              Resources
            </Link>
            <Link
              href="/#classroom-experience"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              About Us
            </Link>
            <Link
              href="/#partner"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
            >
              Contact
            </Link>
            <div className="pt-2">
              <Link
                href="/#partner"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
              >
                <span>Partner With RMS</span>
              </Link>
            </div>
          </nav>

          <div className="pt-3 border-t border-border space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
              Access Portals
            </div>
            {portalOptions.map((portal) => (
              <a
                key={portal.name}
                href={portal.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium hover:border-primary/40 transition-colors"
              >
                <span>{portal.name}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
