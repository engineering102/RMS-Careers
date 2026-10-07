'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  FileQuestion,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Search,
  Filter,
  Eye,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  Users,
  Award,
  HelpCircle,
  FolderGit2,
  BarChart3
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
import { EmptyState } from '@/components/admin/empty-state';
import { formatDate } from '@/lib/utils/format-date';
import { toast } from 'sonner';
import {
  getAttemptDetailsAction,
  exportAssessmentCsvAction
} from './actions';
import type {
  BatchAssessmentOverviewItem,
  AttemptListItem,
  AttemptInspectorDetails
} from '@/lib/db/queries';
import type { Batch, College, Program } from '@rms/db';

interface BatchAssessmentsClientProps {
  batch: Batch;
  college: College | null;
  program: Program | null;
  overviewItems: BatchAssessmentOverviewItem[];
  initialAttempts: AttemptListItem[];
  initialQuizId?: string;
}

export function BatchAssessmentsClient({
  batch,
  college,
  program,
  overviewItems,
  initialAttempts,
  initialQuizId
}: BatchAssessmentsClientProps) {
  // Selected Assessment
  const [selectedQuizId, setSelectedQuizId] = React.useState<string>(
    initialQuizId || (overviewItems.length > 0 ? overviewItems[0].quizId : '')
  );

  // Attempt List State
  const [attempts, setAttempts] = React.useState<AttemptListItem[]>(initialAttempts);
  const [isExportingCsv, setIsExportingCsv] = React.useState(false);

  // Filters State
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'completed' | 'in_progress'>('all');
  const [resultFilter, setResultFilter] = React.useState<'all' | 'passed' | 'failed'>('all');
  const [anomalyFilter, setAnomalyFilter] = React.useState<'all' | 'flagged' | 'normal'>('all');

  // Attempt Inspector Modal State
  const [isInspectorOpen, setIsInspectorOpen] = React.useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [inspectorDetails, setInspectorDetails] = React.useState<AttemptInspectorDetails | null>(null);

  const selectedAssessment = overviewItems.find((item) => item.quizId === selectedQuizId);

  // Aggregate Metrics across the entire batch
  const totalAssigned = overviewItems.length;
  const totalFormal = overviewItems.filter((i) => i.quizType === 'formal').length;
  const totalAttemptsCount = overviewItems.reduce((acc, i) => acc + i.attemptsStarted, 0);
  const totalCompletedCount = overviewItems.reduce((acc, i) => acc + i.attemptsCompleted, 0);
  const totalFlaggedCount = overviewItems.reduce((acc, i) => acc + i.flaggedCount, 0);

  // Filter attempts in client memory for instant responsive UI
  const filteredAttempts = React.useMemo(() => {
    return attempts.filter((att) => {
      // Must match selected quiz
      if (att.quizId !== selectedQuizId) return false;

      // Status Filter
      if (statusFilter !== 'all' && att.status !== statusFilter) return false;

      // Result Filter
      if (resultFilter === 'passed' && !att.isPassed) return false;
      if (resultFilter === 'failed' && (att.isPassed || att.status !== 'completed')) return false;

      // Anomaly Filter
      if (anomalyFilter === 'flagged' && !att.isFlagged) return false;
      if (anomalyFilter === 'normal' && att.isFlagged) return false;

      // Search term
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const matchesName = att.studentName.toLowerCase().includes(term);
        const matchesEmail = att.studentEmail.toLowerCase().includes(term);
        const matchesRoll = (att.collegeRollNumber || '').toLowerCase().includes(term);
        if (!matchesName && !matchesEmail && !matchesRoll) return false;
      }

      return true;
    });
  }, [attempts, selectedQuizId, statusFilter, resultFilter, anomalyFilter, search]);

  // Open Attempt Inspector
  const handleOpenInspector = async (attemptId: string) => {
    setIsInspectorOpen(true);
    setIsLoadingDetails(true);
    setInspectorDetails(null);

    try {
      const res = await getAttemptDetailsAction(batch.id, attemptId);
      if (!res.success) {
        toast.error(res.error);
        setIsInspectorOpen(false);
        return;
      }
      setInspectorDetails(res.data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load attempt details.');
      setIsInspectorOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Export CSV Action
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const res = await exportAssessmentCsvAction(batch.id, selectedQuizId || undefined);
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      // Trigger browser download via Blob
      const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', res.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Assessment results report downloaded.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export CSV report.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
            <Link href="/batches">
              <ArrowLeft className="h-4 w-4" />
              All Batches
            </Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-semibold text-foreground text-sm truncate max-w-[280px]">
            {batch.name}
          </span>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Assessment Operations
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8 border-primary/30 hover:bg-primary/5">
            <Link href={`/batches/${batch.id}/analytics`}>
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              Analytics
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8">
            <Link href={`/batches/${batch.id}/projects`}>
              <FolderGit2 className="h-3.5 w-3.5 text-amber-600" />
              Projects
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8">
            <Link href={`/batches/${batch.id}/external-assessments`}>
              <Award className="h-3.5 w-3.5 text-emerald-600" />
              External
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs h-8">
            <Link href={`/batches/${batch.id}/curriculum`}>
              <BookOpen className="h-3.5 w-3.5" />
              Curriculum Builder
            </Link>
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handleExportCsv}
            disabled={isExportingCsv || overviewItems.length === 0}
            className="gap-1.5 text-xs h-8"
          >
            <Download className="h-3.5 w-3.5" />
            {isExportingCsv ? 'Exporting...' : 'Export Results CSV'}
          </Button>
        </div>
      </div>

      {/* Header Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {batch.name}
            </h1>
            <Badge variant="outline" className="capitalize text-xs font-medium">
              {batch.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            {college && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {college.name} ({college.code})
              </span>
            )}
            {program && (
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                {program.name} ({program.code})
              </span>
            )}
            {batch.startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Timeline: {formatDate(batch.startDate)} –{' '}
                {batch.endDate ? formatDate(batch.endDate) : 'Present'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Batch-wide Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Quizzes
            </p>
            <FileQuestion className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalAssigned}</span>
            <span className="text-xs text-muted-foreground">
              ({totalFormal} formal, {totalAssigned - totalFormal} practice)
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Attempts
            </p>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{totalAttemptsCount}</span>
            <span className="text-xs text-muted-foreground">
              ({totalCompletedCount} submitted)
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cohort Pass Rate
            </p>
            <Award className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {selectedAssessment?.passRatePercent !== null && selectedAssessment?.passRatePercent !== undefined ? (
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {selectedAssessment.passRatePercent}%
              </span>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">—</span>
            )}
            <span className="text-xs text-muted-foreground">selected quiz</span>
          </div>
        </Card>

        <Card className="p-4 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proctoring Alerts
            </p>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                totalFlaggedCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {totalFlaggedCount}
            </span>
            <span className="text-xs text-muted-foreground">flagged attempts (≥3 blurs)</span>
          </div>
        </Card>
      </div>

      {/* Section 2: Assessment Selector & Overview Cards */}
      {overviewItems.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No Assessments Assigned to Batch"
          description="This batch does not currently have any quiz or assessment items placed in its curriculum schedule."
          action={
            <Button asChild className="gap-2">
              <Link href={`/batches/${batch.id}/curriculum`}>
                <BookOpen className="h-4 w-4" />
                Open Curriculum Builder
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Assessment Cards Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Batch Assessments
              </h2>
              <span className="text-xs text-muted-foreground">
                Click an assessment to inspect student attempts and proctoring telemetry
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overviewItems.map((item) => {
                const isSelected = item.quizId === selectedQuizId;

                return (
                  <button
                    key={item.quizId}
                    type="button"
                    onClick={() => setSelectedQuizId(item.quizId)}
                    className={`text-left rounded-lg border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                            W{item.weekNumber}
                          </Badge>
                          <Badge
                            variant={item.quizType === 'formal' ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 uppercase"
                          >
                            {item.quizType}
                          </Badge>
                          {item.isRequired && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-700 dark:text-amber-400">
                              Required
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {item.title}
                        </h3>
                      </div>

                      {item.flaggedCount > 0 && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] shrink-0"
                          title={`${item.flaggedCount} attempt(s) with >= 3 tab blurs`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {item.flaggedCount}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Attempts: <strong className="text-foreground">{item.attemptsCompleted}</strong>
                        /{item.eligibleStudentsCount}
                      </span>
                      {item.passRatePercent !== null ? (
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {item.passRatePercent}% pass rate
                        </span>
                      ) : (
                        <span>No submissions</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Attempt Monitoring Table */}
          {selectedAssessment && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        Attempts for: {selectedAssessment.title}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {selectedAssessment.quizType === 'formal' ? 'Formal Timed' : 'Practice'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Passing score: {selectedAssessment.passingScorePercent}% |{' '}
                      {selectedAssessment.timeLimitMinutes
                        ? `Time limit: ${selectedAssessment.timeLimitMinutes} mins`
                        : 'Self-paced'}
                    </CardDescription>
                  </div>

                  <Badge variant="secondary" className="font-mono text-xs self-start md:self-auto">
                    {filteredAttempts.length} of {attempts.filter((a) => a.quizId === selectedQuizId).length} Attempts
                  </Badge>
                </div>

                {/* Filter Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student or roll #..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed / Submitted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Result Filter */}
                  <Select
                    value={resultFilter}
                    onValueChange={(val) => setResultFilter(val as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Results</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Proctoring Filter */}
                  <Select
                    value={anomalyFilter}
                    onValueChange={(val) => setAnomalyFilter(val as any)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Proctoring" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Proctoring</SelectItem>
                      <SelectItem value="flagged">Flagged Anomalies (≥3 blurs)</SelectItem>
                      <SelectItem value="normal">Normal Telemetry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredAttempts.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-semibold text-foreground">No matching attempts found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try clearing filters or checking another assessment in the batch.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Proctoring Telemetry</TableHead>
                          <TableHead className="hidden lg:table-cell">Started</TableHead>
                          <TableHead className="hidden lg:table-cell">Duration</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttempts.map((att) => {
                          return (
                            <TableRow key={att.attemptId} className="hover:bg-muted/40">
                              {/* Student Info */}
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground text-sm leading-tight">
                                    {att.studentName}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {att.studentEmail}
                                  </span>
                                  {att.collegeRollNumber && (
                                    <span className="text-[11px] font-mono text-muted-foreground/80 mt-0.5">
                                      Roll: {att.collegeRollNumber}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Status */}
                              <TableCell>
                                {att.status === 'completed' ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs"
                                  >
                                    <Clock className="h-3 w-3 text-amber-600" />
                                    In Progress
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Score & Percentage */}
                              <TableCell>
                                {att.status === 'completed' ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground text-sm font-mono">
                                      {att.score} / {att.maxScore}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {att.percentage}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              {/* Pass / Fail Result */}
                              <TableCell>
                                {att.status === 'completed' ? (
                                  att.isPassed ? (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
                                      Passed
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">
                                      Failed
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Tab Blur Telemetry */}
                              <TableCell>
                                {att.isFlagged ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs font-medium"
                                  >
                                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                                    {att.tabBlurCount} tab switch{att.tabBlurCount === 1 ? '' : 'es'}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    {att.tabBlurCount} switches
                                  </span>
                                )}
                              </TableCell>

                              {/* Timestamps */}
                              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                                {formatDate(att.startedAt)}
                              </TableCell>

                              {/* Duration */}
                              <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground">
                                {att.durationSeconds !== null ? (
                                  <span>
                                    {Math.floor(att.durationSeconds / 60)}m {att.durationSeconds % 60}s
                                  </span>
                                ) : (
                                  <span>Running</span>
                                )}
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenInspector(att.attemptId)}
                                  className="gap-1 h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Inspect
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Attempt Inspector Dialog */}
      <Dialog open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              Attempt Inspection & Proctoring Telemetry
            </DialogTitle>
            <DialogDescription>
              Authoritative question-by-question result breakdown for student assessment submission.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading attempt details...
            </div>
          ) : inspectorDetails ? (
            <div className="space-y-4 py-2">
              {/* Student & Assessment Header Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border p-3.5 bg-muted/40 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Student</p>
                  <p className="font-semibold text-sm text-foreground">
                    {inspectorDetails.studentName}
                  </p>
                  <p className="text-muted-foreground">{inspectorDetails.studentEmail}</p>
                  {inspectorDetails.collegeRollNumber && (
                    <p className="font-mono text-muted-foreground/80">
                      Roll: {inspectorDetails.collegeRollNumber}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:text-right">
                  <p className="text-muted-foreground">Assessment & Batch</p>
                  <p className="font-semibold text-sm text-foreground">
                    {inspectorDetails.assessmentTitle}
                  </p>
                  <p className="text-muted-foreground">Batch: {inspectorDetails.batchName}</p>
                  <div className="flex sm:justify-end gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {inspectorDetails.quizType}
                    </Badge>
                    <Badge
                      className={
                        inspectorDetails.isPassed
                          ? 'bg-emerald-600 text-white text-[10px]'
                          : 'bg-destructive text-white text-[10px]'
                      }
                    >
                      {inspectorDetails.isPassed ? 'Passed' : 'Failed'} ({inspectorDetails.score}/
                      {inspectorDetails.maxScore} — {inspectorDetails.percentage}%)
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Proctoring Anomaly Telemetry Banner */}
              <div
                className={`rounded-lg border p-3 text-xs flex items-start gap-3 ${
                  inspectorDetails.isFlagged
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <ShieldAlert
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    inspectorDetails.isFlagged ? 'text-amber-600' : 'text-primary'
                  }`}
                />
                <div className="space-y-1 flex-1">
                  <p className="font-semibold text-foreground">
                    Proctoring Telemetry:{' '}
                    <span className="font-mono">{inspectorDetails.tabBlurCount}</span> Window/Tab Switch
                    Events
                  </p>
                  <p className="text-xs leading-relaxed opacity-90">
                    {inspectorDetails.isFlagged
                      ? 'Elevated window switching detected (≥3 events). Telemetry indicates browser blur events and does not confirm academic dishonesty.'
                      : 'Tab blur activity remained within standard operational thresholds during the testing session.'}
                  </p>
                </div>
              </div>

              {/* Question-by-Question Breakdown */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Question Responses ({inspectorDetails.questions.length})
                </h4>

                <div className="space-y-3">
                  {inspectorDetails.questions.map((q, idx) => (
                    <div
                      key={q.questionId}
                      className={`rounded-lg border p-3.5 space-y-2.5 transition-colors ${
                        q.isCorrect
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-destructive/30 bg-destructive/5'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                              q.isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-destructive text-white'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <p className="text-xs font-medium text-foreground leading-snug">
                            {q.questionText}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-semibold">
                            {q.earnedPoints} / {q.points} pt
                          </span>
                        </div>
                      </div>

                      {/* Options with student and correct selections marked */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isSelectedByStudent = q.selectedOptionIds.includes(opt.id);
                          const isAuthoritativeCorrect = q.correctOptionIds.includes(opt.id);

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-start gap-2 rounded border p-2 text-xs ${
                                isAuthoritativeCorrect
                                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-medium'
                                  : isSelectedByStudent
                                  ? 'border-destructive/50 bg-destructive/10 text-destructive font-medium'
                                  : 'border-border/60 text-muted-foreground opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                {isAuthoritativeCorrect && (
                                  <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                                )}
                                {isSelectedByStudent && !isAuthoritativeCorrect && (
                                  <X className="h-3.5 w-3.5 text-destructive stroke-[3]" />
                                )}
                              </div>
                              <span className="flex-1 break-words">{opt.text}</span>
                              {isSelectedByStudent && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 border-current"
                                >
                                  Student Choice
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanationText && (
                        <div className="rounded border border-blue-500/20 bg-blue-500/5 p-2 text-[11px] text-blue-900 dark:text-blue-300">
                          <span className="font-semibold">Explanation: </span>
                          {q.explanationText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-destructive">
              Failed to load attempt details.
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setIsInspectorOpen(false)}>
              Close Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
