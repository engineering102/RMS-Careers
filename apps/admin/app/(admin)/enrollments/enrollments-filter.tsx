'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, RotateCcw, Filter, Download } from 'lucide-react';
import type { Program } from '@rms/db';
import { exportEnrollmentsCsvAction } from './actions';
import { toast } from 'sonner';

interface EnrollmentsFilterProps {
  programs: Program[];
  resultCount: number;
}

export function EnrollmentsFilter({ programs, resultCount }: EnrollmentsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = React.useState(searchParams.get('q') || '');
  const [exporting, setExporting] = React.useState(false);

  // Sync search input state if URL param changes
  React.useEffect(() => {
    setSearchValue(searchParams.get('q') || '');
  }, [searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/enrollments?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchValue.trim());
  };

  const handleClearFilters = () => {
    setSearchValue('');
    router.push('/enrollments');
  };

  const hasActiveFilters =
    Boolean(searchParams.get('q')) ||
    Boolean(searchParams.get('program')) ||
    Boolean(searchParams.get('status')) ||
    Boolean(searchParams.get('year')) ||
    Boolean(searchParams.get('emailStatus')) ||
    Boolean(searchParams.get('sort'));

  const handleExportFiltered = async () => {
    setExporting(true);
    const options = {
      search: searchParams.get('q') || undefined,
      programCodeFilter: searchParams.get('program') || undefined,
      statusFilter: searchParams.get('status') || undefined,
      yearFilter: searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined,
      emailStatusFilter: searchParams.get('emailStatus') || undefined,
      sort: searchParams.get('sort') || undefined
    };

    const res = await exportEnrollmentsCsvAction(options);
    setExporting(false);

    if (res.success && res.csvData) {
      const blob = new Blob([res.csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', res.filename || 'enrollments_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Filtered enrollments exported successfully');
    } else {
      toast.error(res.error || 'Failed to export enrollments');
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-[240px] items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by student name, email, roll number..."
              className="pl-9 h-9 text-xs"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs">
            Search
          </Button>
        </form>

        {/* Actions (Export & Clear) */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearFilters}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportFiltered}
            disabled={exporting || resultCount === 0}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{exporting ? 'Exporting...' : 'Export Filtered CSV'}</span>
          </Button>
        </div>
      </div>

      {/* Filter Select Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1 border-t">
        {/* Program Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> Program
          </label>
          <Select
            value={searchParams.get('program') || 'all'}
            onValueChange={(val) => updateParam('program', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.code}>
                  {p.name} ({p.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enrollment Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Enrollment Status</label>
          <Select
            value={searchParams.get('status') || 'all'}
            onValueChange={(val) => updateParam('status', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="waitlisted">Waitlisted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Academic Year Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Academic Year</label>
          <Select
            value={searchParams.get('year') || 'all'}
            onValueChange={(val) => updateParam('year', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Years</SelectItem>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Email Status</label>
          <Select
            value={searchParams.get('emailStatus') || 'all'}
            onValueChange={(val) => updateParam('emailStatus', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Email Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Email Statuses</SelectItem>
              <SelectItem value="sent">Email Sent</SelectItem>
              <SelectItem value="unsent">Email Not Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Sort By</label>
          <Select
            value={searchParams.get('sort') || 'newest'}
            onValueChange={(val) => updateParam('sort', val)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name_asc">Student Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Student Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
