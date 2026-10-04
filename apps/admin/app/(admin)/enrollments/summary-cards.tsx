'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, CheckCircle2, UserCheck, XCircle, MailCheck, MailWarning } from 'lucide-react';
import type { EnrollmentSummaryStats } from '@/lib/db/queries';

interface SummaryCardsProps {
  stats: EnrollmentSummaryStats;
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterClick = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    router.push(`/enrollments?${params.toString()}`);
  };

  const activeStatus = searchParams.get('status') || 'all';
  const activeEmailStatus = searchParams.get('emailStatus') || 'all';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* Total Enrollments */}
      <Card
        className={`cursor-pointer transition-all hover:border-primary/50 shadow-sm ${
          activeStatus === 'all' && activeEmailStatus === 'all' ? 'ring-2 ring-primary/20 border-primary' : ''
        }`}
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('status');
          params.delete('emailStatus');
          params.set('page', '1');
          router.push(`/enrollments?${params.toString()}`);
        }}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{stats.total}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card
        className={`cursor-pointer transition-all hover:border-amber-500/50 shadow-sm ${
          activeStatus === 'pending' ? 'ring-2 ring-amber-500/20 border-amber-500 bg-amber-50/20' : ''
        }`}
        onClick={() => handleFilterClick('status', 'pending')}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-xl font-bold tracking-tight text-amber-600">{stats.pending}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Confirmed */}
      <Card
        className={`cursor-pointer transition-all hover:border-emerald-500/50 shadow-sm ${
          activeStatus === 'confirmed' ? 'ring-2 ring-emerald-500/20 border-emerald-500 bg-emerald-50/20' : ''
        }`}
        onClick={() => handleFilterClick('status', 'confirmed')}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Confirmed</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600">{stats.confirmed}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Waitlisted */}
      <Card
        className={`cursor-pointer transition-all hover:border-blue-500/50 shadow-sm ${
          activeStatus === 'waitlisted' ? 'ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20' : ''
        }`}
        onClick={() => handleFilterClick('status', 'waitlisted')}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Waitlisted</p>
            <p className="text-xl font-bold tracking-tight text-blue-600">{stats.waitlisted}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <UserCheck className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Cancelled */}
      <Card
        className={`cursor-pointer transition-all hover:border-slate-500/50 shadow-sm ${
          activeStatus === 'cancelled' ? 'ring-2 ring-slate-500/20 border-slate-500 bg-slate-50/20' : ''
        }`}
        onClick={() => handleFilterClick('status', 'cancelled')}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Cancelled</p>
            <p className="text-xl font-bold tracking-tight text-slate-600">{stats.cancelled}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <XCircle className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Emails Sent */}
      <Card
        className={`cursor-pointer transition-all hover:border-blue-500/50 shadow-sm ${
          activeEmailStatus === 'sent' ? 'ring-2 ring-blue-500/20 border-blue-500 bg-blue-50/20' : ''
        }`}
        onClick={() => handleFilterClick('emailStatus', 'sent')}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email Sent</p>
            <p className="text-xl font-bold tracking-tight text-blue-700">{stats.emailsSent}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <MailCheck className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>

      {/* Emails Not Sent / Failed */}
      <Card
        className={`cursor-pointer transition-all hover:border-amber-500/50 shadow-sm ${
          activeEmailStatus === 'unsent' ? 'ring-2 ring-amber-500/20 border-amber-500 bg-amber-50/20' : ''
        }`}
        onClick={() => handleFilterClick('emailStatus', 'unsent')}
      >
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Not Sent</p>
            <p className="text-xl font-bold tracking-tight text-amber-700">{stats.emailsFailed}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <MailWarning className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
