'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  FileQuestion,
  FolderGit2,
  Award,
  Upload,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Percent,
  Trash2,
  RefreshCw,
  Sparkles,
  ArrowUpDown
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
  DialogTitle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import { toast } from 'sonner';
import {
  previewExternalAssessmentCsvAction,
  confirmExternalAssessmentImportAction,
  deleteExternalAssessmentRecordAction
} from './actions';
import { generateExternalAssessmentCsvTemplate } from '@/lib/utils/external-assessment-template';
import type {
  BatchExternalAssessmentItem,
  BatchExternalAssessmentStats,
  BatchExternalAssessmentRecordItem
} from '@/lib/db/queries/batch-external-assessments';
import type { ValidationPreviewResult } from '@/lib/services/external-assessment-parser';
import type { Batch, College, Program } from '@rms/db';

interface BatchExternalAssessmentsClientProps {
  batch: Batch;
  college: College | null;
  program: Program | null;
  overview: {
    assessments: BatchExternalAssessmentItem[];
    stats: BatchExternalAssessmentStats;
  };
  initialRecords: BatchExternalAssessmentRecordItem[];
}

export function BatchExternalAssessmentsClient({
  batch,
  college,
  program,
  overview,
  initialRecords
}: BatchExternalAssessmentsClientProps) {
  const router = useRouter();
  const [records, setRecords] = React.useState<BatchExternalAssessmentRecordItem[]>(initialRecords);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [providerFilter, setProviderFilter] = React.useState<string>('all');
  const [assessmentFilter, setAssessmentFilter] = React.useState<string>('all');
  const [tierFilter, setTierFilter] = React.useState<string>('all');

  // Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = React.useState<boolean>(false);
  const [csvContent, setCsvContent] = React.useState<string>('');
  const [fileName, setFileName] = React.useState<string>('');
  const [defaultAssessmentCode, setDefaultAssessmentCode] = React.useState<string>('');
  const [defaultAssessmentName, setDefaultAssessmentName] = React.useState<string>('');
  const [defaultProvider, setDefaultProvider] = React.useState<string>('');
  const [defaultMaxScore, setDefaultMaxScore] = React.useState<string>('100');
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<'update' | 'skip'>('update');

  // Validation Preview State
  const [previewResult, setPreviewResult] = React.useState<ValidationPreviewResult | null>(null);
  const [isValidating, setIsValidating] = React.useState<boolean>(false);
  const [isPersisting, setIsPersisting] = React.useState<boolean>(false);
  const [previewTab, setPreviewTab] = React.useState<'all' | 'valid' | 'issues'>('all');

  // Delete State
  const [deletingRecordId, setDeletingRecordId] = React.useState<number | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Available filters from overview
  const uniqueProviders = Array.from(new Set(overview.assessments.map((a) => a.provider)));
  const uniqueCodes = Array.from(new Set(overview.assessments.map((a) => a.assessmentCode)));

  const highestScoreAcrossAssessments =
    overview.assessments.length > 0
      ? Math.max(...overview.assessments.map((a) => a.highestScore))
      : null;

  // Filtered records
  const filteredRecords = React.useMemo(() => {
    return records.filter((rec) => {
      if (providerFilter !== 'all' && rec.provider.toLowerCase() !== providerFilter.toLowerCase()) {
        return false;
      }
      if (assessmentFilter !== 'all' && rec.assessmentCode.toLowerCase() !== assessmentFilter.toLowerCase()) {
        return false;
      }
      if (tierFilter !== 'all' && rec.performanceTier !== tierFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesStudent = rec.studentName.toLowerCase().includes(q);
        const matchesEmail = rec.studentEmail.toLowerCase().includes(q);
        const matchesRoll = rec.collegeRollNumber?.toLowerCase().includes(q) || false;
        const matchesCode = rec.assessmentCode.toLowerCase().includes(q);
        const matchesName = rec.assessmentName.toLowerCase().includes(q);
        const matchesProvider = rec.provider.toLowerCase().includes(q);

        if (!matchesStudent && !matchesEmail && !matchesRoll && !matchesCode && !matchesName && !matchesProvider) {
          return false;
        }
      }

      return true;
    });
  }, [records, providerFilter, assessmentFilter, tierFilter, searchQuery]);

  // Handle CSV File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content || '');
    };
    reader.readAsText(file);
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const template = generateExternalAssessmentCsvTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'rms_external_assessment_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Sample CSV template downloaded');
  };

  // Preview & Validate CSV
  const handleAnalyzeCsv = async () => {
    if (!csvContent.trim()) {
      toast.error('Please select or upload a CSV file.');
      return;
    }

    setIsValidating(true);
    try {
      const parsedMax = parseInt(defaultMaxScore, 10);
      const res = await previewExternalAssessmentCsvAction(batch.id, csvContent, {
        assessmentCode: defaultAssessmentCode.trim(),
        assessmentName: defaultAssessmentName.trim(),
        provider: defaultProvider.trim(),
        defaultMaxScore: !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : 100
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to parse assessment CSV.');
        return;
      }

      setPreviewResult(res.data);
      if (res.data.summary.invalidCount > 0 || res.data.summary.unmatchedCount > 0) {
        setPreviewTab('issues');
        toast.warning(
          `Analyzed ${res.data.summary.totalRows} rows: ${res.data.summary.validCount} valid, ${res.data.summary.invalidCount + res.data.summary.unmatchedCount} with issues.`
        );
      } else {
        setPreviewTab('all');
        toast.success(`Analyzed ${res.data.summary.totalRows} rows: all rows valid and matched!`);
      }
    } catch {
      toast.error('An unexpected error occurred during CSV parsing.');
    } finally {
      setIsValidating(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = async () => {
    if (!previewResult) return;

    const validRows = previewResult.rows
      .filter((r) => r.status === 'valid')
      .map((r) => ({
        studentId: r.studentId!,
        assessmentCode: r.assessmentCode,
        assessmentName: r.assessmentName,
        provider: r.provider,
        maxScore: r.maxScore,
        obtainedScore: r.obtainedScore,
        percentile: r.percentile
      }));

    if (validRows.length === 0) {
      toast.error('No valid rows available to import. Please review validation issues.');
      return;
    }

    setIsPersisting(true);
    try {
      const res = await confirmExternalAssessmentImportAction(batch.id, {
        duplicateStrategy,
        rows: validRows
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to complete import.');
        return;
      }

      toast.success(
        res.message ||
          `Successfully processed: ${res.insertedCount} inserted, ${res.updatedCount} updated, ${res.skippedCount} skipped.`
      );
      setImportDialogOpen(false);
      resetImportState();
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred while persisting results.');
    } finally {
      setIsPersisting(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (recordId: number) => {
    setIsDeleting(true);
    try {
      const res = await deleteExternalAssessmentRecordAction(batch.id, recordId);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete record.');
        return;
      }

      toast.success(res.message || 'Assessment record removed.');
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setDeletingRecordId(null);
      router.refresh();
    } catch {
      toast.error('Failed to delete assessment record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetImportState = () => {
    setCsvContent('');
    setFileName('');
    setPreviewResult(null);
    setDefaultAssessmentCode('');
    setDefaultAssessmentName('');
    setDefaultProvider('');
    setDefaultMaxScore('100');
    setDuplicateStrategy('update');
  };

  // Tier Badge helper
  const renderTierBadge = (tier: string) => {
    switch (tier) {
      case 'elite':
        return (
          <Badge className="bg-purple-600/10 text-purple-700 dark:text-purple-400 border-purple-500/20 hover:bg-purple-600/20">
            Elite (≥90%)
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-600/20">
            Advanced (≥75%)
          </Badge>
        );
      case 'proficient':
        return (
          <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/20">
            Proficient (≥60%)
          </Badge>
        );
      case 'developing':
      default:
        return (
          <Badge className="bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-600/20">
            Developing (&lt;60%)
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/batches"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Batches</span>
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">{batch.name}</span>
            <span>/</span>
            <span>External Assessments</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">External Assessments Ingestion</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {batch.name}
            </Badge>
            {college && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Building2 className="h-3 w-3" />
                {college.name}
              </Badge>
            )}
            {program && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <BookOpen className="h-3 w-3" />
                {program.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Action Controls & Shortcuts */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetImportState();
              setImportDialogOpen(true);
            }}
            className="gap-1.5 text-xs shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 text-xs shadow-sm">
            <Link href={`/batches/${batch.id}/assessments`}>
              <FileQuestion className="h-3.5 w-3.5 text-violet-600" />
              <span>Assessments</span>
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 text-xs shadow-sm">
            <Link href={`/batches/${batch.id}/projects`}>
              <FolderGit2 className="h-3.5 w-3.5 text-amber-600" />
              <span>Projects</span>
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 text-xs shadow-sm">
            <Link href={`/batches/${batch.id}/curriculum`}>
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              <span>Curriculum</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Distinct Assessments</CardDescription>
            <CardTitle className="text-2xl font-bold">{overview.stats.totalAssessmentsCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-primary" />
            Configured Codes
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Ingested Records</CardDescription>
            <CardTitle className="text-2xl font-bold">{overview.stats.totalRecordsCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Total Rows
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Cohort Coverage</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.stats.participatedStudentsCount}
              <span className="text-xs font-normal text-muted-foreground"> / {overview.stats.enrolledStudentsCount}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            Students Evaluated
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Participation Rate</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.stats.participationRatePercent.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-purple-600" />
            Batch Enrollees
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Average Score</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.stats.overallAveragePercentage !== null
                ? `${overview.stats.overallAveragePercentage.toFixed(1)}%`
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Normalized Mean
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Peak Score</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {highestScoreAcrossAssessments !== null ? highestScoreAcrossAssessments : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-teal-600" />
            Top Points
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <Card className="border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, roll no, email, assessment, provider..."
                className="pl-8 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Provider Filter */}
            <div className="w-full sm:w-44">
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {uniqueProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assessment Code Filter */}
            <div className="w-full sm:w-48">
              <Select value={assessmentFilter} onValueChange={setAssessmentFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Assessments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assessments</SelectItem>
                  {uniqueCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tier Filter */}
            <div className="w-full sm:w-40">
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="elite">Elite (≥90%)</SelectItem>
                  <SelectItem value="advanced">Advanced (≥75%)</SelectItem>
                  <SelectItem value="proficient">Proficient (≥60%)</SelectItem>
                  <SelectItem value="developing">Developing (&lt;60%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {(searchQuery || providerFilter !== 'all' || assessmentFilter !== 'all' || tierFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs px-2.5"
                onClick={() => {
                  setSearchQuery('');
                  setProviderFilter('all');
                  setAssessmentFilter('all');
                  setTierFilter('all');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Results List Table */}
      {filteredRecords.length === 0 ? (
        <Card className="shadow-sm">
          <EmptyState
            icon={FileSpreadsheet}
            title={records.length === 0 ? 'No external assessments imported yet' : 'No records match filter criteria'}
            description={
              records.length === 0
                ? 'Import external assessment CSV scores from arbitrary evaluation platforms (e.g. HackerRank, AMCAT, Mettl) directly into this batch.'
                : 'Try adjusting your search keywords, provider, or tier filters.'
            }
            action={
              records.length === 0 ? (
                <Button
                  onClick={() => {
                    resetImportState();
                    setImportDialogOpen(true);
                  }}
                  className="gap-2 text-xs"
                >
                  <Upload className="h-4 w-4" />
                  Import Assessment CSV
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Assessment</TableHead>
                <TableHead className="font-semibold">Provider</TableHead>
                <TableHead className="font-semibold text-right">Score</TableHead>
                <TableHead className="font-semibold text-right">Percentage</TableHead>
                <TableHead className="font-semibold text-right">Percentile</TableHead>
                <TableHead className="font-semibold">Performance Tier</TableHead>
                <TableHead className="font-semibold">Imported Date</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((rec) => (
                <TableRow key={rec.id} className="hover:bg-muted/30">
                  {/* Student */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground text-sm">{rec.studentName}</span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        {rec.collegeRollNumber && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                            {rec.collegeRollNumber}
                          </Badge>
                        )}
                        <span>{rec.studentEmail}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Assessment */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground text-sm">{rec.assessmentName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{rec.assessmentCode}</span>
                    </div>
                  </TableCell>

                  {/* Provider */}
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {rec.provider}
                    </Badge>
                  </TableCell>

                  {/* Score */}
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {rec.obtainedScore}
                    <span className="text-muted-foreground font-normal text-xs"> / {rec.maxScore}</span>
                  </TableCell>

                  {/* Percentage */}
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {rec.percentage.toFixed(1)}%
                  </TableCell>

                  {/* Percentile */}
                  <TableCell className="text-right font-mono text-xs">
                    {rec.percentile !== null ? `${rec.percentile.toFixed(1)}%ile` : '—'}
                  </TableCell>

                  {/* Tier */}
                  <TableCell>{renderTierBadge(rec.performanceTier)}</TableCell>

                  {/* Imported Date */}
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{formatDate(rec.importedAt)}</span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingRecordId(rec.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete record"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Record Confirmation Dialog */}
      <Dialog open={deletingRecordId !== null} onOpenChange={(open) => !open && setDeletingRecordId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Assessment Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this imported external assessment result? This action is scoped strictly to this batch and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingRecordId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingRecordId !== null && handleDeleteRecord(deletingRecordId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. CSV Import & Validation Workflow Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Import External Assessment CSV
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Upload arbitrary provider evaluation results for batch{' '}
                  <span className="font-semibold text-foreground">{batch.name}</span>.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-1.5 text-xs shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Sample Template
              </Button>
            </div>
          </DialogHeader>

          {/* Workflow Step 1: Configuration & File Selection */}
          {!previewResult ? (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Assessment Code <span className="text-muted-foreground font-normal">(Default if omitted in CSV)</span>
                  </label>
                  <Input
                    placeholder="e.g. HCKR-ALGO-2026 or AMCAT-QNT-01"
                    value={defaultAssessmentCode}
                    onChange={(e) => setDefaultAssessmentCode(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Assessment Name <span className="text-muted-foreground font-normal">(Default if omitted in CSV)</span>
                  </label>
                  <Input
                    placeholder="e.g. Algorithms & Data Structures Assessment"
                    value={defaultAssessmentName}
                    onChange={(e) => setDefaultAssessmentName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Provider Name <span className="text-muted-foreground font-normal">(Default if omitted in CSV)</span>
                  </label>
                  <Input
                    placeholder="e.g. HackerRank, AMCAT, Mettl, Wheebox, CodeChef"
                    value={defaultProvider}
                    onChange={(e) => setDefaultProvider(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Default Max Score <span className="text-muted-foreground font-normal">(Default if omitted in CSV)</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={defaultMaxScore}
                    onChange={(e) => setDefaultMaxScore(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* File Upload Box */}
              <div className="rounded-lg border-2 border-dashed p-6 text-center hover:bg-muted/30 transition-colors">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm font-semibold text-foreground">
                  {fileName ? fileName : 'Select an external assessment CSV file'}
                </div>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  CSV must include student identifier (<span className="font-mono">roll_number</span> or{' '}
                  <span className="font-mono">email</span>) and <span className="font-mono">score</span>.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="max-w-xs text-xs h-9 cursor-pointer"
                  />
                </div>
              </div>

              {/* Information Note */}
              <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Provider-Neutral Student Matching
                </div>
                <p>
                  Students are matched strictly within this batch (<span className="font-medium text-foreground">{batch.name}</span>)
                  using their college roll number or email. Unmatched students and out-of-batch candidates will be flagged
                  in the validation preview.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(false)}
                  disabled={isValidating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAnalyzeCsv}
                  disabled={!csvContent.trim() || isValidating}
                  className="gap-1.5"
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Parsing &amp; Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Analyze &amp; Validate CSV
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Workflow Step 2: Validation Preview & Summary */
            <div className="space-y-4 py-2">
              {/* Summary Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-lg border bg-card">
                  <span className="text-[11px] text-muted-foreground block">Total Parsed</span>
                  <span className="text-xl font-bold">{previewResult.summary.totalRows}</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">Valid Rows</span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{previewResult.summary.validCount}</span>
                </div>
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <span className="text-[11px] text-destructive block font-medium">Invalid Scores / Formats</span>
                  <span className="text-xl font-bold text-destructive">{previewResult.summary.invalidCount}</span>
                </div>
                <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 block font-medium">Unmatched Students</span>
                  <span className="text-xl font-bold text-purple-700 dark:text-purple-400">{previewResult.summary.unmatchedCount}</span>
                </div>
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                  <span className="text-[11px] text-blue-700 dark:text-blue-400 block font-medium">Existing Duplicates</span>
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-400">{previewResult.summary.dbDuplicateCount}</span>
                </div>
              </div>

              {/* Duplicate Strategy Controls */}
              {previewResult.summary.dbDuplicateCount > 0 && (
                <div className="p-3 rounded-md border border-blue-500/30 bg-blue-500/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Deterministic Duplicate Handling
                    </span>
                    <span className="text-muted-foreground">
                      {previewResult.summary.dbDuplicateCount} record(s) already exist for this student and assessment code in this batch.
                    </span>
                  </div>
                  <div className="w-56">
                    <Select
                      value={duplicateStrategy}
                      onValueChange={(val: 'update' | 'skip') => setDuplicateStrategy(val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="update">Update Existing Score</SelectItem>
                        <SelectItem value="skip">Skip / Keep Existing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Preview Tabs */}
              <Tabs value={previewTab} onValueChange={(val: any) => setPreviewTab(val)}>
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">
                    All Rows ({previewResult.summary.totalRows})
                  </TabsTrigger>
                  <TabsTrigger value="valid" className="text-xs">
                    Valid ({previewResult.summary.validCount})
                  </TabsTrigger>
                  <TabsTrigger value="issues" className="text-xs">
                    Issues ({previewResult.summary.invalidCount + previewResult.summary.unmatchedCount + previewResult.summary.csvDuplicateCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={previewTab} className="mt-3">
                  <div className="max-h-[320px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Student Identifier</TableHead>
                          <TableHead>Matched Student</TableHead>
                          <TableHead>Assessment</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">%</TableHead>
                          <TableHead>Status &amp; Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResult.rows
                          .filter((r) => {
                            if (previewTab === 'valid') return r.status === 'valid';
                            if (previewTab === 'issues') return r.status !== 'valid';
                            return true;
                          })
                          .map((row) => (
                            <TableRow
                              key={`preview-${row.rowIndex}`}
                              className={
                                row.status !== 'valid'
                                  ? 'bg-destructive/5 hover:bg-destructive/10'
                                  : 'hover:bg-muted/30'
                              }
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                #{row.rowIndex}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {row.rawIdentifier}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.studentName ? (
                                  <div>
                                    <span className="font-semibold text-foreground">{row.studentName}</span>
                                    {row.collegeRollNumber && (
                                      <span className="text-muted-foreground block text-[11px] font-mono">
                                        {row.collegeRollNumber}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-destructive font-medium italic">Unmatched</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <div>
                                  <span className="font-medium text-foreground">{row.assessmentCode}</span>
                                  <span className="text-muted-foreground block text-[11px]">{row.provider}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold">
                                {row.obtainedScore ?? '—'} / {row.maxScore ?? '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {row.percentage !== undefined ? `${row.percentage.toFixed(1)}%` : '—'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.status === 'valid' ? (
                                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>
                                      {row.isDbDuplicate ? `Duplicate (will ${duplicateStrategy})` : 'Valid'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-destructive font-medium text-[11px]">
                                    <XCircle className="h-3 w-3 shrink-0" />
                                    <span>{row.error}</span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewResult(null)}
                  disabled={isPersisting}
                >
                  Back to Config
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={previewResult.summary.validCount === 0 || isPersisting}
                  className="gap-1.5"
                >
                  {isPersisting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Persisting Results...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Import ({previewResult.summary.validCount} Records)
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
