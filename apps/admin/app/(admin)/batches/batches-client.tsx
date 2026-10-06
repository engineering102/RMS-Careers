'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Layers,
  PlusCircle,
  Users,
  Calendar,
  Building2,
  BookOpen,
  FilterX,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import { toast } from 'sonner';
import { createBatchAction } from './actions';
import type { BatchWithDetails } from '@/lib/db/queries';
import type { College, Program } from '@rms/db';

interface BatchesClientProps {
  initialBatches: BatchWithDetails[];
  colleges: College[];
  programs: Program[];
  selectedCollegeId?: string;
  selectedProgramId?: number;
  searchQuery?: string;
}

export function BatchesClient({
  initialBatches,
  colleges,
  programs,
  selectedCollegeId,
  selectedProgramId,
  searchQuery
}: BatchesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Form State inside Dialog
  const [formName, setFormName] = React.useState('');
  const [formCollegeId, setFormCollegeId] = React.useState('');
  const [formProgramId, setFormProgramId] = React.useState('');
  const [formStartDate, setFormStartDate] = React.useState('');
  const [formEndDate, setFormEndDate] = React.useState('');

  // Filter States
  const [filterCollege, setFilterCollege] = React.useState(selectedCollegeId || 'all');
  const [filterProgram, setFilterProgram] = React.useState(
    selectedProgramId ? String(selectedProgramId) : 'all'
  );
  const [search, setSearch] = React.useState(searchQuery || '');

  // Programs available for the currently selected filter college
  const filterAvailablePrograms = React.useMemo(() => {
    if (filterCollege === 'all') return programs;
    return programs.filter((p) => p.collegeId === filterCollege);
  }, [programs, filterCollege]);

  // Programs available in the create modal based on the chosen college
  const modalAvailablePrograms = React.useMemo(() => {
    if (!formCollegeId) return [];
    return programs.filter((p) => p.collegeId === formCollegeId);
  }, [programs, formCollegeId]);

  // Apply filters via URL params
  const applyFilters = React.useCallback(
    (newCollege: string, newProgram: string, newSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newCollege && newCollege !== 'all') {
        params.set('college', newCollege);
      } else {
        params.delete('college');
      }

      if (newProgram && newProgram !== 'all') {
        params.set('program', newProgram);
      } else {
        params.delete('program');
      }

      if (newSearch && newSearch.trim()) {
        params.set('q', newSearch.trim());
      } else {
        params.delete('q');
      }

      router.push(`/batches?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleCollegeFilterChange = (val: string) => {
    setFilterCollege(val);
    // If the currently selected program doesn't belong to the new college, reset program to 'all'
    let nextProgram = filterProgram;
    if (val !== 'all') {
      const validForNewCollege = programs.some(
        (p) => p.collegeId === val && String(p.id) === filterProgram
      );
      if (!validForNewCollege) {
        nextProgram = 'all';
        setFilterProgram('all');
      }
    }
    applyFilters(val, nextProgram, search);
  };

  const handleProgramFilterChange = (val: string) => {
    setFilterProgram(val);
    applyFilters(filterCollege, val, search);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(filterCollege, filterProgram, search);
  };

  const handleResetFilters = () => {
    setFilterCollege('all');
    setFilterProgram('all');
    setSearch('');
    router.push('/batches');
  };

  const hasActiveFilters =
    filterCollege !== 'all' || filterProgram !== 'all' || (search && search.trim().length > 0);

  // Form submit handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error('Batch name is required.');
      return;
    }
    if (!formCollegeId) {
      toast.error('Please select an institution / college.');
      return;
    }
    if (!formProgramId) {
      toast.error('Please select a program.');
      return;
    }
    if (!formStartDate) {
      toast.error('Start date is required.');
      return;
    }
    if (!formEndDate) {
      toast.error('End date is required.');
      return;
    }
    if (new Date(formEndDate) < new Date(formStartDate)) {
      toast.error('End date must not precede start date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createBatchAction({
        name: formName.trim(),
        collegeId: formCollegeId,
        programId: parseInt(formProgramId, 10),
        startDate: new Date(formStartDate),
        endDate: new Date(formEndDate),
        status: 'active'
      });

      if (res.success) {
        toast.success(`Batch "${formName.trim()}" created successfully.`);
        setIsCreateOpen(false);
        // Reset form
        setFormName('');
        setFormCollegeId('');
        setFormProgramId('');
        setFormStartDate('');
        setFormEndDate('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to create batch.');
      }
    } catch (err: any) {
      console.error('Error submitting create batch form:', err);
      toast.error('An unexpected error occurred while creating batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600/90 text-white border-0">
            Active
          </Badge>
        );
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'archived':
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {initialBatches.length} {initialBatches.length === 1 ? 'Cohort' : 'Cohorts'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage institutional cohorts, academic timelines, and student enrollment groups.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5 shadow-sm">
              <PlusCircle className="h-4 w-4" />
              <span>Create Batch</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Create Batch</DialogTitle>
                <DialogDescription>
                  Define a new student training cohort tied to an academic program and institution.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Batch Name */}
                <div className="grid gap-2">
                  <label htmlFor="batchName" className="text-sm font-medium">
                    Batch Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="batchName"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. 2026 CSE Alpha Cohort"
                    required
                  />
                </div>

                {/* College Selection */}
                <div className="grid gap-2">
                  <label htmlFor="batchCollege" className="text-sm font-medium">
                    College / Institution <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formCollegeId}
                    onValueChange={(val) => {
                      setFormCollegeId(val);
                      setFormProgramId(''); // Reset program selection when college changes
                    }}
                  >
                    <SelectTrigger id="batchCollege">
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name} ({col.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Program Selection */}
                <div className="grid gap-2">
                  <label htmlFor="batchProgram" className="text-sm font-medium">
                    Program <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formProgramId}
                    onValueChange={setFormProgramId}
                    disabled={!formCollegeId}
                  >
                    <SelectTrigger id="batchProgram">
                      <SelectValue
                        placeholder={
                          formCollegeId
                            ? modalAvailablePrograms.length > 0
                              ? 'Select program'
                              : 'No programs available for this college'
                            : 'Select a college first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {modalAvailablePrograms.map((prog) => (
                        <SelectItem key={prog.id} value={String(prog.id)}>
                          {prog.name} ({prog.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formCollegeId && (
                    <p className="text-xs text-muted-foreground">
                      Choose an institution first to view associated programs.
                    </p>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="startDate" className="text-sm font-medium">
                      Start Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="endDate" className="text-sm font-medium">
                      End Date <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Default Status Notice */}
                <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                  New batches are initialized in <span className="font-semibold text-foreground">Active</span> lifecycle status with open enrollment readiness.
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Batch'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Toolbar */}
      <Card className="border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* College Filter */}
            <div className="w-full sm:w-64">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Filter by College
              </label>
              <Select value={filterCollege} onValueChange={handleCollegeFilterChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Colleges</SelectItem>
                  {colleges.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name} ({col.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Program Filter */}
            <div className="w-full sm:w-64">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Filter by Program
              </label>
              <Select value={filterProgram} onValueChange={handleProgramFilterChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {filterAvailablePrograms.map((prog) => (
                    <SelectItem key={prog.id} value={String(prog.id)}>
                      {prog.name} ({prog.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Search Batch Name
              </label>
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search batches..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-8"
                  />
                </div>
              </form>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="self-end pb-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batches Table or Empty State */}
      {initialBatches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={hasActiveFilters ? 'No batches match the filters' : 'No batches created yet'}
          description={
            hasActiveFilters
              ? 'Try selecting a different college or program filter, or clear all filters to see all cohorts.'
              : 'Create your first institutional training batch to begin organizing student placement cohorts.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                <PlusCircle className="h-4 w-4" />
                <span>Create First Batch</span>
              </Button>
            )
          }
        />
      ) : (
        <Card className="border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Batch Name</TableHead>
                <TableHead className="font-semibold">College</TableHead>
                <TableHead className="font-semibold">Program</TableHead>
                <TableHead className="font-semibold">Timeline</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="font-semibold text-right">Enrolled Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialBatches.map((batch) => (
                <TableRow key={batch.id} className="hover:bg-muted/30">
                  {/* Name */}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{batch.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {batch.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* College */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{batch.collegeName}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        {batch.collegeCode}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Program */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{batch.programName}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                        {batch.programCode}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Timeline */}
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {batch.startDate && batch.endDate ? (
                        <span>
                          {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
                        </span>
                      ) : batch.startDate ? (
                        <span>From {formatDate(batch.startDate)}</span>
                      ) : (
                        <span>Not specified</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {getStatusBadge(batch.status)}
                  </TableCell>

                  {/* Enrolled Count */}
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-semibold">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>{batch.enrollmentCount}</span>
                      <span className="text-muted-foreground font-normal">
                        {batch.enrollmentCount === 1 ? 'student' : 'students'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
