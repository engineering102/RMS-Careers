'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { STUDENT_NAV_ITEMS } from './nav-items';
import type { StudentEntitlementContext, StudentBatchItem } from '@/lib/db/queries/entitlements';
import { signOutAction } from '@/lib/actions/auth';
import { CohortSwitcher } from './cohort-switcher';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  context: StudentEntitlementContext;
  activeCohort?: StudentBatchItem | null;
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ context, activeCohort = null, open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const student = context.student;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-slate-950 border-r border-slate-800 p-4 text-slate-100 shadow-2xl">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-400" />
            <div>
              <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">RMS Careers</span>
              <p className="text-xs font-semibold text-slate-200">Student Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Cohort Switcher */}
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Current Cohort</p>
          <CohortSwitcher
            activeBatches={context.activeBatches}
            activeCohort={activeCohort}
            variant="sidebar"
          />
        </div>

        {/* Navigation Items */}
        <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto" aria-label="Mobile Navigation">
          {STUDENT_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const itemHref =
              item.href === '/batches' && activeCohort
                ? `/batches/${activeCohort.batchId}`
                : item.href;
            const isActive =
              pathname === itemHref ||
              (item.href !== '/overview' && pathname.startsWith(item.href));

            if (item.disabled) {
              return (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium text-slate-500 cursor-not-allowed select-none"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 opacity-60" />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.title}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition',
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 font-semibold border-l-2 border-blue-500 pl-2.5'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-400' : 'text-slate-400')} />
                  <span>{item.title}</span>
                </div>
                {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-xs font-semibold text-slate-200">{student?.fullName || 'Student'}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                <Building2 className="h-3 w-3 shrink-0 text-slate-500" />
                <span className="truncate">{student?.collegeName || 'RMS Partner College'}</span>
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
