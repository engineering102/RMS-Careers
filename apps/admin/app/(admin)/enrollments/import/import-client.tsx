'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Mail,
  Users,
  Building2,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  validateImportFileAction,
  executeBulkImportAction,
  getDownloadTemplateCsvAction,
  getDownloadErrorReportCsvAction,
  type ImportPreviewData,
  type ImportSummaryData
} from './actions';
import { type ValidatedImportRow } from '@/lib/csv/validator';
import { toast } from 'sonner';
import type { Program, Batch, College } from '@/lib/db';
import { Layers } from 'lucide-react';

interface BulkImportClientProps {
  programs: Program[];
  colleges?: College[];
  batches?: Batch[];
}

export function BulkImportClient({
  programs,
  colleges = [],
  batches = []
}: BulkImportClientProps) {
  const router = useRouter();

  // Active step: 1 = Upload/Select, 2 = Preview, 3 = Processing, 4 = Summary
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedCollegeId, setSelectedCollegeId] = React.useState<string>('all');
  const [selectedProgramId, setSelectedProgramId] = React.useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>('');
  const [file, setFile] = React.useState<File | null>(null);
  const [sendEmails, setSendEmails] = React.useState<boolean>(false);

  // Loading & error states
  const [isValidating, setIsValidating] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Data states
  const [previewData, setPreviewData] = React.useState<ImportPreviewData | null>(null);
  const [summaryData, setSummaryData] = React.useState<ImportSummaryData | null>(null);
  const [tableFilter, setTableFilter] = React.useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all');

  // Filtered programs and batches
  const availablePrograms = React.useMemo(() => {
    if (!selectedCollegeId || selectedCollegeId === 'all') return programs;
    return programs.filter((p) => p.collegeId === selectedCollegeId);
  }, [programs, selectedCollegeId]);

  const availableBatches = React.useMemo(() => {
    if (!selectedProgramId) return [];
    return batches.filter((b) => b.programId === Number(selectedProgramId));
  }, [batches, selectedProgramId]);

  const selectedProgram = programs.find((p) => String(p.id) === selectedProgramId);
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  // Handle college change
  const handleCollegeChange = (collegeId: string) => {
    setSelectedCollegeId(collegeId);
    if (selectedProgramId) {
      const p = programs.find((pr) => String(pr.id) === selectedProgramId);
      if (p && collegeId !== 'all' && p.collegeId !== collegeId) {
        setSelectedProgramId('');
        setSelectedBatchId('');
      }
    }
  };

  // Handle program change
  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedBatchId(''); // Clear incompatible batch!
    const p = programs.find((pr) => String(pr.id) === programId);
    if (p?.collegeId && selectedCollegeId === 'all') {
      setSelectedCollegeId(p.collegeId);
    }
  };

  // 1. Download Sample CSV Template
  async function handleDownloadTemplate() {
    try {
      const csvContent = await getDownloadTemplateCsvAction();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Academy_Enrollment_Import_Template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Import template downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download template.');
    }
  }

  // 2. Validate File & Show Preview
  async function handleValidateFile(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProgramId) {
      toast.error('Please select a program first.');
      return;
    }
    if (!selectedBatchId) {
      toast.error('Please select a target batch.');
      return;
    }
    if (!file) {
      toast.error('Please upload a CSV or Excel file.');
      return;
    }

    setIsValidating(true);
    const formData = new FormData();
    formData.append('programId', selectedProgramId);
    formData.append('batchId', selectedBatchId);
    formData.append('file', file);

    try {
      const result = await validateImportFileAction(formData);
      if (result.success) {
        setPreviewData(result.preview);
        setStep(2);
        toast.success(`File parsed: ${result.preview.totalRows} rows found.`);
      } else {
        setErrorMsg(result.error);
        toast.error(result.error);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process file.');
      toast.error('File validation failed.');
    } finally {
      setIsValidating(false);
    }
  }

  // 3. Download Error Report
  async function handleDownloadErrorReport() {
    if (!previewData) return;
    try {
      const csvContent = await getDownloadErrorReportCsvAction(previewData.rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Import_Error_Report_${previewData.program.code}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Error report downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download error report.');
    }
  }

  // 4. Confirm & Execute Bulk Import
  async function handleExecuteImport() {
    if (!previewData) return;
    if (previewData.isExceedingCapacity) {
      toast.error('Import exceeds available program capacity.');
      return;
    }

    setIsExecuting(true);
    setStep(3);

    try {
      const result = await executeBulkImportAction({
        programId: previewData.program.id,
        batchId: previewData.batch.id,
        rows: previewData.rows,
        sendEmails
      });

      if (result.success) {
        setSummaryData(result.summary);
        setStep(4);
        toast.success('Bulk import completed successfully!');
      } else {
        setErrorMsg(result.error);
        setStep(2);
        toast.error(result.error);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred during import execution.');
      setStep(2);
      toast.error('Import execution failed.');
    } finally {
      setIsExecuting(false);
    }
  }

  // Helper row status badge
  const getRowStatusBadge = (status: ValidatedImportRow['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Valid</Badge>;
      case 'invalid':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Error</Badge>;
      case 'in_file_duplicate':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">File Duplicate</Badge>;
      case 'already_enrolled':
        return <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">Already Enrolled</Badge>;
    }
  };

  // Filtered rows for preview table
  const filteredRows = React.useMemo(() => {
    if (!previewData) return [];
    if (tableFilter === 'valid') return previewData.rows.filter((r) => r.status === 'valid');
    if (tableFilter === 'invalid') return previewData.rows.filter((r) => r.status === 'invalid');
    if (tableFilter === 'duplicates') return previewData.rows.filter((r) => r.status === 'in_file_duplicate' || r.status === 'already_enrolled');
    return previewData.rows;
  }, [previewData, tableFilter]);

  // ================= STEP 4: FINAL SUMMARY =================
  if (step === 4 && summaryData) {
    return (
      <Card className="max-w-2xl mx-auto shadow-md animate-in fade-in-50 border-emerald-200 dark:border-emerald-950">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Import Complete
          </CardTitle>
          <CardDescription className="text-base">
            Bulk student enrollment has been processed into PostgreSQL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg border bg-muted/30">
              <span className="text-xs text-muted-foreground block">Total Rows</span>
              <span className="text-xl font-bold text-foreground">{summaryData.totalRows}</span>
            </div>
            <div className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-200 text-emerald-900">
              <span className="text-xs text-emerald-700 block">New Enrollments</span>
              <span className="text-xl font-bold text-emerald-700">{summaryData.newEnrollmentsCount}</span>
            </div>
            <div className="p-3 rounded-lg border bg-blue-50/50 border-blue-200 text-blue-900">
              <span className="text-xs text-blue-700 block">New Students</span>
              <span className="text-xl font-bold text-blue-700">{summaryData.newStudentsCount}</span>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <span className="text-xs text-muted-foreground block">Existing Reused</span>
              <span className="text-xl font-bold text-foreground">{summaryData.reusedStudentsCount}</span>
            </div>
            <div className="p-3 rounded-lg border bg-slate-100 border-slate-200">
              <span className="text-xs text-slate-600 block">Already Enrolled</span>
              <span className="text-xl font-bold text-slate-700">{summaryData.alreadyEnrolledCount}</span>
            </div>
            <div className="p-3 rounded-lg border bg-purple-50/50 border-purple-200 text-purple-900">
              <span className="text-xs text-purple-700 block">Emails Sent</span>
              <span className="text-xl font-bold text-purple-700">{summaryData.emailsSentCount}</span>
            </div>
          </div>

          {summaryData.emailFailuresCount > 0 && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{summaryData.emailFailuresCount} email(s) failed or skipped during delivery. Enrollments remain created.</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2 flex justify-center">
          <Button onClick={() => router.push('/enrollments')} className="gap-2">
            Back to Enrollments
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ================= STEP 3: PROCESSING OVERLAY =================
  if (step === 3) {
    return (
      <Card className="max-w-md mx-auto py-12 text-center shadow-md">
        <CardContent className="space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-bold tracking-tight">Processing Bulk Import</h3>
          <p className="text-sm text-muted-foreground">
            Creating student records and enrolling into database. Please do not close this window...
          </p>
        </CardContent>
      </Card>
    );
  }

  // ================= STEP 2: PREVIEW & CONFIRMATION =================
  if (step === 2 && previewData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(1)}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Change File or Program
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Program: {previewData.program.name} ({previewData.program.code})
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1 bg-primary/10 text-primary">
              <Layers className="h-3 w-3" /> Batch: {previewData.batch.name}
            </Badge>
          </div>
        </div>

        {/* Capacity & Error Warning Banner */}
        {previewData.isExceedingCapacity ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-base">Import Exceeds Program Capacity</h4>
              <p className="mt-1 leading-relaxed">
                Program capacity is <strong>{previewData.program.capacity}</strong> (Remaining seats: <strong>{previewData.program.remainingCapacity}</strong>).
                You have <strong>{previewData.newValidCount}</strong> new valid enrollments ready to be imported.
                Please reduce records in your file or select another program.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 text-emerald-950 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>
                Ready to import <strong>{previewData.newValidCount}</strong> valid enrollments into <strong>{previewData.program.name}</strong>.
              </span>
            </div>
            {previewData.program.capacity > 0 && (
              <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-medium">
                Capacity: {previewData.program.enrolledCount + previewData.newValidCount} / {previewData.program.capacity}
              </span>
            )}
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3 text-center">
            <span className="text-xs text-muted-foreground block">Total Rows</span>
            <span className="text-xl font-bold">{previewData.totalRows}</span>
          </Card>
          <Card className="p-3 text-center bg-emerald-50/30 border-emerald-200">
            <span className="text-xs text-emerald-700 block">Valid Rows</span>
            <span className="text-xl font-bold text-emerald-700">{previewData.validCount}</span>
          </Card>
          <Card className="p-3 text-center bg-rose-50/30 border-rose-200">
            <span className="text-xs text-rose-700 block">Row Errors</span>
            <span className="text-xl font-bold text-rose-700">{previewData.invalidCount}</span>
          </Card>
          <Card className="p-3 text-center bg-amber-50/30 border-amber-200">
            <span className="text-xs text-amber-700 block">File Duplicates</span>
            <span className="text-xl font-bold text-amber-700">{previewData.duplicateInFileCount}</span>
          </Card>
          <Card className="p-3 text-center bg-slate-50 border-slate-200">
            <span className="text-xs text-slate-600 block">Already Enrolled</span>
            <span className="text-xl font-bold text-slate-700">{previewData.alreadyEnrolledCount}</span>
          </Card>
        </div>

        {/* Options & Action Bar */}
        <Card className="p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Email Toggle Option */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sendEmailsToggle"
                checked={sendEmails}
                onChange={(e) => setSendEmails(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="sendEmailsToggle" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-muted-foreground" /> Send registration acknowledgement emails (Phase 3)
              </label>
            </div>

            <div className="flex items-center gap-2">
              {(previewData.invalidCount > 0 || previewData.duplicateInFileCount > 0) && (
                <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> Download Error Report
                </Button>
              )}
              <Button
                onClick={handleExecuteImport}
                disabled={previewData.newValidCount === 0 || previewData.isExceedingCapacity}
                className="gap-2 font-medium"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm & Import {previewData.newValidCount} Students
              </Button>
            </div>
          </div>
        </Card>

        {/* Preview Data Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Upload Preview Data</CardTitle>
              <CardDescription className="text-xs">
                Review parsed records before confirming database insertion.
              </CardDescription>
            </div>
            {/* Table Filter Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs">
              <button
                onClick={() => setTableFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tableFilter === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
              >
                All ({previewData.rows.length})
              </button>
              <button
                onClick={() => setTableFilter('valid')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tableFilter === 'valid' ? 'bg-background shadow text-emerald-700' : 'text-muted-foreground'}`}
              >
                Valid ({previewData.validCount})
              </button>
              <button
                onClick={() => setTableFilter('invalid')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tableFilter === 'invalid' ? 'bg-background shadow text-rose-700' : 'text-muted-foreground'}`}
              >
                Errors ({previewData.invalidCount})
              </button>
              <button
                onClick={() => setTableFilter('duplicates')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${tableFilter === 'duplicates' ? 'bg-background shadow text-amber-700' : 'text-muted-foreground'}`}
              >
                Duplicates ({previewData.duplicateInFileCount + previewData.alreadyEnrolledCount})
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[450px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[60px]">Row</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Branch & Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue / Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.rowIndex} className={row.status === 'invalid' ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.rowIndex}</TableCell>
                    <TableCell className="font-medium text-xs">{row.fullName || '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.email || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{row.collegeRollNumber || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {row.branch} {row.yearFormatted ? `(${row.yearFormatted})` : ''}
                    </TableCell>
                    <TableCell>{getRowStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {row.issue || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ================= STEP 1: SELECT PROGRAM & UPLOAD FILE =================
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Student Enrollment Import</h1>
          <p className="text-sm text-muted-foreground">
            Import student enrollment lists from CSV or Excel spreadsheets.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/enrollments')} className="gap-1.5 text-xs">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Button>
      </div>

      <Card className="shadow-md">
        <form onSubmit={handleValidateFile}>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <FileSpreadsheet className="h-4 w-4" /> Import Configuration
            </div>
            <CardTitle className="text-lg font-bold">1. Select Target Program & Download Template</CardTitle>
            <CardDescription>
              Choose which active program the students will be enrolled into.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Optional College Filter */}
            {colleges.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="collegeSelect" className="text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> College / Institution Filter
                </label>
                <Select value={selectedCollegeId} onValueChange={handleCollegeChange}>
                  <SelectTrigger id="collegeSelect" className="h-11">
                    <SelectValue placeholder="-- All Colleges --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colleges / Standalone</SelectItem>
                    {colleges.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Target Program Selection */}
            <div className="space-y-2">
              <label htmlFor="programSelect" className="text-sm font-medium">
                Target Academy Program <span className="text-destructive">*</span>
              </label>
              <Select value={selectedProgramId} onValueChange={handleProgramChange}>
                <SelectTrigger id="programSelect" className="h-11">
                  <SelectValue placeholder="-- Select Target Program --" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} disabled={p.status === 'archived'}>
                      {p.name} ({p.code}) — {p.status.toUpperCase()} {p.capacity > 0 ? `| Capacity: ${p.capacity}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Program Info Card */}
            {selectedProgram && (
              <div className="p-3.5 rounded-lg border bg-muted/30 text-xs space-y-1.5 animate-in fade-in-50">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-foreground font-semibold">{selectedProgram.name}</span>
                  <Badge variant="outline" className="font-mono">{selectedProgram.code}</Badge>
                </div>
                {selectedProgram.description && (
                  <p className="text-muted-foreground">{selectedProgram.description}</p>
                )}
              </div>
            )}

            {/* Target Batch Selection (Scoped to Program) */}
            <div className="space-y-2">
              <label htmlFor="batchSelect" className="text-sm font-medium flex items-center justify-between">
                <span>
                  Target Batch / Cohort <span className="text-destructive">*</span>
                </span>
                {selectedProgramId && (
                  <span className="text-xs text-muted-foreground">
                    {availableBatches.length} batch{availableBatches.length === 1 ? '' : 'es'} available
                  </span>
                )}
              </label>
              <Select
                value={selectedBatchId}
                onValueChange={setSelectedBatchId}
                disabled={!selectedProgramId || availableBatches.length === 0}
              >
                <SelectTrigger id="batchSelect" className="h-11">
                  <SelectValue
                    placeholder={
                      !selectedProgramId
                        ? '-- Select a Program first --'
                        : availableBatches.length === 0
                        ? '-- No Batches available for this Program --'
                        : '-- Select Target Batch --'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableBatches.map((b) => (
                    <SelectItem key={b.id} value={b.id} disabled={b.status === 'archived'}>
                      {b.name} ({b.status.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProgramId && availableBatches.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No batches exist for this program yet. Please create a batch in the Batches tab first.
                </p>
              )}
            </div>

            {/* Batch Info Card */}
            {selectedBatch && (
              <div className="p-3.5 rounded-lg border bg-primary/5 border-primary/20 text-xs space-y-1 animate-in fade-in-50">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-foreground font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" /> {selectedBatch.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {selectedBatch.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[11px] flex gap-4">
                  {selectedBatch.startDate && (
                    <span>Starts: {new Date(selectedBatch.startDate).toLocaleDateString()}</span>
                  )}
                  {selectedBatch.endDate && (
                    <span>Ends: {new Date(selectedBatch.endDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}

            {/* Template Download Box */}
            <div className="p-4 rounded-lg border border-dashed bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Standard Import Template</h4>
                  <p className="text-xs text-muted-foreground">
                    Contains required columns: Full Name, Email, Phone, Roll Number, Branch, Academic Year.
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> Download Template CSV
              </Button>
            </div>

            {/* File Upload Box */}
            <div className="space-y-2">
              <label htmlFor="fileInput" className="text-sm font-medium">
                2. Upload Student List File (.csv, .xlsx) <span className="text-destructive">*</span>
              </label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer relative">
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="text-sm font-semibold text-primary">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Drag & drop or click to choose file</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports CSV and Excel files up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={!selectedProgramId || !selectedBatchId || !file || isValidating}
              className="h-11 px-6 font-medium gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Parsing & Validating File...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" /> Parse & Preview Records
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
