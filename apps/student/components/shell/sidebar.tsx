'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { STUDENT_NAV_ITEMS } from './nav-items';
import type { StudentEntitlementContext } from '@/lib/db/queries/entitlements';
import { signOutAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

export function Sidebar({ context }: { context: StudentEntitlementContext }) {
  const pathname = usePathname();
  const student = context.student;
  const primaryBatch = context.activeBatches[0];

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 shrink-0">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">RMS Careers</span>
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">Student Portal</h2>
        </div>
        <GraduationCap className="h-5 w-5 text-blue-400" />
      </div>

      {/* Batch / Cohort Context */}
      <div className="border-b border-slate-800/80 p-4 bg-slate-900/40">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Cohort</p>
        {primaryBatch ? (
          <div className="mt-1 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{primaryBatch.batchName}</p>
              <p className="text-[11px] text-slate-400 truncate">{primaryBatch.programName}</p>
            </div>
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" title="Enrolled" />
          </div>
        ) : (
          <p className="mt-1 text-xs text-amber-400 font-medium">No Active Batch</p>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3" aria-label="Sidebar Navigation">
        {STUDENT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/overview' && pathname.startsWith(item.href));

          if (item.disabled) {
            return (
              <div
                key={item.title}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-500 cursor-not-allowed select-none"
                title={`${item.title} — ${item.badge || 'Coming Soon'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 opacity-60" />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 font-semibold">
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
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition',
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

      {/* User & College Footer */}
      <div className="border-t border-slate-800 p-4 bg-slate-900/60">
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
