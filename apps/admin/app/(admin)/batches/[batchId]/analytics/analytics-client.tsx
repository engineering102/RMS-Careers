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
  FolderGit2,
  Award,
  BarChart3,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Percent,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  HelpCircle,
  Activity,
  Check,
  TrendingUp,
  AlertCircle
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
import { exportBatchAnalyticsCsvAction } from './actions';
import type {
  BatchAcademicAnalyticsData,
  AnalyticsReportType
} from '@/lib/db/queries/batch-analytics';

interface BatchAnalyticsClientProps {
  data: BatchAcademicAnalyticsData;
}

export function BatchAnalyticsClient({ data }: BatchAnalyticsClientProps) {
  const {
    batch,
    college,
    program,
    overview,
    assessmentPerformance,
    projectPerformance,
    externalAssessmentPerformance,
    distribution,
    needsAttention
  } = data;

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<string>('overview');

  // Filter States
  const [assessmentSearch, setAssessmentSearch] = React.useState<string>('');
  const [assessmentTypeFilter, setAssessmentTypeFilter] = React.useState<string>('all');

  const [projectSearch, setProjectSearch] = React.useState<string>('');

  const [externalSearch, setExternalSearch] = React.useState<string>('');
  const [externalProviderFilter, setExternalProviderFilter] = React.useState<string>('all');

  const [attentionSearch, setAttentionSearch] = React.useState<string>('');
  const [attentionCategoryFilter, setAttentionCategoryFilter] = React.useState<string>('all');

  // Export Loading States
  const [exportingReport, setExportingReport] = React.useState<AnalyticsReportType | null>(null);

  // Distinct providers for filter
  const distinctProviders = Array.from(
    new Set(externalAssessmentPerformance.map((e) => e.provider))
  );

  // 1. Filtered Assessments
  const filteredAssessments = React.useMemo(() => {
    return assessmentPerformance.filter((a) => {
      if (assessmentTypeFilter !== 'all' && a.quizType !== assessmentTypeFilter) {
        return false;
      }
      if (assessmentSearch.trim()) {
        const q = assessmentSearch.trim().toLowerCase();
        return a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [assessmentPerformance, assessmentTypeFilter, assessmentSearch]);

  // 2. Filtered Projects
  const filteredProjects = React.useMemo(() => {
    return projectPerformance.filter((p) => {
      if (projectSearch.trim()) {
        const q = projectSearch.trim().toLowerCase();
        return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      }
      return true;
    });
  }, [projectPerformance, projectSearch]);

  // 3. Filtered External Assessments
  const filteredExternal = React.useMemo(() => {
    return externalAssessmentPerformance.filter((e) => {
      if (externalProviderFilter !== 'all' && e.provider !== externalProviderFilter) {
        return false;
      }
      if (externalSearch.trim()) {
        const q = externalSearch.trim().toLowerCase();
        return (
          e.assessmentCode.toLowerCase().includes(q) ||
          e.assessmentName.toLowerCase().includes(q) ||
          e.provider.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [externalAssessmentPerformance, externalProviderFilter, externalSearch]);

  // 4. Filtered Needs Attention
  const filteredAttention = React.useMemo(() => {
    return needsAttention.filter((s) => {
      if (attentionCategoryFilter !== 'all') {
        const hasCat = s.issues.some((iss) => iss.category === attentionCategoryFilter);
        if (!hasCat) return false;
      }
      if (attentionSearch.trim()) {
        const q = attentionSearch.trim().toLowerCase();
        const matchesName = s.studentName.toLowerCase().includes(q);
        const matchesEmail = s.studentEmail.toLowerCase().includes(q);
        const matchesRoll = s.collegeRollNumber?.toLowerCase().includes(q) || false;
        return matchesName || matchesEmail || matchesRoll;
      }
      return true;
    });
  }, [needsAttention, attentionCategoryFilter, attentionSearch]);

  // Handle CSV Export
  const handleExport = async (reportType: AnalyticsReportType, reportLabel: string) => {
    setExportingReport(reportType);
    try {
      const res = await exportBatchAnalyticsCsvAction(batch.id, reportType);
      if (!res.success || !res.csvContent || !res.filename) {
        toast.error(res.error || `Failed to export ${reportLabel}.`);
        return;
      }

      const blob = new Blob([res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${reportLabel} exported successfully.`);
    } catch {
      toast.error(`An unexpected error occurred while exporting ${reportLabel}.`);
    } finally {
      setExportingReport(null);
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
            <span>Academic Analytics</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Batch Academic Analytics &amp; Reporting</h1>
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
            {batch.startDate && (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(batch.startDate)} – {batch.endDate ? formatDate(batch.endDate) : 'Present'}
              </Badge>
            )}
          </div>
        </div>

        {/* Operational Shortcuts */}
        <div className="flex items-center gap-2">
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
            <Link href={`/batches/${batch.id}/external-assessments`}>
              <Award className="h-3.5 w-3.5 text-emerald-600" />
              <span>External</span>
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

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Cohort Size</CardDescription>
            <CardTitle className="text-2xl font-bold">{overview.enrolledStudentsCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-primary" />
            Enrolled Students
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Quiz Participation</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.quizParticipationRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-violet-600" />
            {overview.quizzesAttemptedCount} of {overview.quizzesAssignedCount} quizzes taken
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Quiz Pass Rate</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.quizPassRate !== null ? `${overview.quizPassRate}%` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {overview.quizAveragePercentage !== null ? `${overview.quizAveragePercentage}% avg score` : 'No attempts'}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Project Progress</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.projectSubmissionRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <FolderGit2 className="h-3.5 w-3.5 text-amber-600" />
            {overview.projectApprovalRate}% approved
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">External Coverage</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {overview.externalParticipationRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-emerald-600" />
            {overview.externalAveragePercentage !== null ? `${overview.externalAveragePercentage}% avg score` : 'No records'}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Needs Attention</CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">
              {needsAttention.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            Intervention Needed
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Analytical Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-10 p-1 bg-muted/60">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Cohort Distributions
          </TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs gap-1.5">
            <FileQuestion className="h-3.5 w-3.5" />
            Assessments ({assessmentPerformance.length})
          </TabsTrigger>
          <TabsTrigger value="projects" className="text-xs gap-1.5">
            <FolderGit2 className="h-3.5 w-3.5" />
            Projects ({projectPerformance.length})
          </TabsTrigger>
          <TabsTrigger value="external" className="text-xs gap-1.5">
            <Award className="h-3.5 w-3.5" />
            External ({externalAssessmentPerformance.length})
          </TabsTrigger>
          <TabsTrigger value="attention" className="text-xs gap-1.5 text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs Attention ({needsAttention.length})
          </TabsTrigger>
          <TabsTrigger value="exports" className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Reports &amp; Exports
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: COHORT DISTRIBUTIONS
        ========================================================================= */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1A. Quiz Score Band Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Quiz Score Distribution Bands
                </CardTitle>
                <CardDescription className="text-xs">
                  Scored completion attempts categorized across achievement thresholds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Elite */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-purple-700 dark:text-purple-400">Elite (≥90%)</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizScoreBands.elite.count} attempts ({distribution.quizScoreBands.elite.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all"
                      style={{ width: `${distribution.quizScoreBands.elite.percent}%` }}
                    />
                  </div>
                </div>

                {/* Advanced */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-blue-700 dark:text-blue-400">Advanced (75%–89%)</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizScoreBands.advanced.count} attempts ({distribution.quizScoreBands.advanced.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${distribution.quizScoreBands.advanced.percent}%` }}
                    />
                  </div>
                </div>

                {/* Proficient */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Proficient (60%–74%)</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizScoreBands.proficient.count} attempts ({distribution.quizScoreBands.proficient.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{ width: `${distribution.quizScoreBands.proficient.percent}%` }}
                    />
                  </div>
                </div>

                {/* Developing */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-amber-700 dark:text-amber-400">Developing (&lt;60%)</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizScoreBands.developing.count} attempts ({distribution.quizScoreBands.developing.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full transition-all"
                      style={{ width: `${distribution.quizScoreBands.developing.percent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1B. Student Quiz Completion Progress */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Quiz Completion Progress (Cohort)
                </CardTitle>
                <CardDescription className="text-xs">
                  Proportion of batch enrollees completing assigned quizzes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Completed All Quizzes</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizCompletionBands.completedAll.count} students ({distribution.quizCompletionBands.completedAll.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${distribution.quizCompletionBands.completedAll.percent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-blue-700 dark:text-blue-400">Partially Completed</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizCompletionBands.completedPartial.count} students ({distribution.quizCompletionBands.completedPartial.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${distribution.quizCompletionBands.completedPartial.percent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-destructive">No Quizzes Completed</span>
                    <span className="text-muted-foreground font-mono">
                      {distribution.quizCompletionBands.none.count} students ({distribution.quizCompletionBands.none.percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive rounded-full"
                      style={{ width: `${distribution.quizCompletionBands.none.percent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1C. Project Milestone Status Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-amber-600" />
                  Project Milestones Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Status breakdown of project submissions across the cohort.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {distribution.projectStatusDistribution.approved}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Approved</span>
                  </div>
                  <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {distribution.projectStatusDistribution.submittedOrUnderReview}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">In Review</span>
                  </div>
                  <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                      {distribution.projectStatusDistribution.changesRequested}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Changes Requested</span>
                  </div>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {distribution.projectStatusDistribution.notSubmitted}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">Unsubmitted</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1D. External Assessment Performance Tiers */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  External Evaluation Tiers
                </CardTitle>
                <CardDescription className="text-xs">
                  Third-party evaluation performance across all ingested records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/5">
                    <span className="text-xl font-bold text-purple-700 dark:text-purple-400">
                      {distribution.externalTierDistribution.elite}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">Elite (≥90%)</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5">
                    <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                      {distribution.externalTierDistribution.advanced}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">Advanced (≥75%)</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                    <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {distribution.externalTierDistribution.proficient}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">Proficient (≥60%)</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                      {distribution.externalTierDistribution.developing}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">Developing (&lt;60%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 2: ASSESSMENT PERFORMANCE
        ========================================================================= */}
        <TabsContent value="assessments" className="space-y-4">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by assessment title, slug..."
                    className="pl-8 h-9 text-xs"
                    value={assessmentSearch}
                    onChange={(e) => setAssessmentSearch(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select value={assessmentTypeFilter} onValueChange={setAssessmentTypeFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="formal">Formal Graded</SelectItem>
                      <SelectItem value="practice">Practice Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(assessmentSearch || assessmentTypeFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs px-2.5"
                    onClick={() => {
                      setAssessmentSearch('');
                      setAssessmentTypeFilter('all');
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredAssessments.length === 0 ? (
            <Card className="shadow-sm">
              <EmptyState
                icon={FileQuestion}
                title="No assessments found"
                description={
                  assessmentPerformance.length === 0
                    ? 'No quizzes have been assigned to this batch in the curriculum builder.'
                    : 'No quizzes match the current search or filter criteria.'
                }
              />
            </Card>
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                    <TableHead>Assessment Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Eligible</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Participation</TableHead>
                    <TableHead className="text-right">Average</TableHead>
                    <TableHead className="text-right">Pass Rate</TableHead>
                    <TableHead className="text-right">Peak / Low</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((quiz) => (
                    <TableRow key={quiz.quizId} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{quiz.title}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            Week {quiz.weekNumber} • Passing threshold: {quiz.passingScorePercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={quiz.quizType === 'formal' ? 'default' : 'secondary'}
                          className="capitalize text-xs font-normal"
                        >
                          {quiz.quizType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {quiz.eligibleStudentsCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="font-semibold">{quiz.attemptsCompleted}</span>
                        <span className="text-muted-foreground text-[11px]"> / {quiz.attemptsStarted}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {quiz.participationRatePercent}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {quiz.averagePercentage !== null ? `${quiz.averagePercentage}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {quiz.passRatePercent !== null ? (
                          <span
                            className={
                              quiz.passRatePercent >= 70
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : 'text-amber-700 dark:text-amber-400 font-semibold'
                            }
                          >
                            {quiz.passRatePercent}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {quiz.highestScore !== null && quiz.lowestScore !== null
                          ? `${quiz.highestScore} / ${quiz.lowestScore}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                          <Link href={`/batches/${batch.id}/assessments?quizId=${quiz.quizId}`}>
                            <span>Monitor</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 3: PROJECT PERFORMANCE
        ========================================================================= */}
        <TabsContent value="projects" className="space-y-4">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by project title, slug..."
                    className="pl-8 h-9 text-xs"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                </div>
                {projectSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs px-2.5"
                    onClick={() => setProjectSearch('')}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredProjects.length === 0 ? (
            <Card className="shadow-sm">
              <EmptyState
                icon={FolderGit2}
                title="No projects found"
                description={
                  projectPerformance.length === 0
                    ? 'No project milestones have been assigned to this batch curriculum.'
                    : 'No projects match your search keywords.'
                }
              />
            </Card>
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                    <TableHead>Project Milestone</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Submissions</TableHead>
                    <TableHead className="text-right">Submission Rate</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">In Review / Changes</TableHead>
                    <TableHead className="text-right">Approval Rate</TableHead>
                    <TableHead className="text-right">Average Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((proj) => (
                    <TableRow key={proj.assignmentId} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{proj.title}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            Week {proj.weekNumber} • Max Points: {proj.maxScore}
                            {proj.dueAt && ` • Due ${formatDate(proj.dueAt)}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {proj.assignedStudentsCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {proj.totalSubmissionsCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {proj.submissionRatePercent}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        {proj.approvedCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {proj.submittedCount + proj.underReviewCount} / {proj.changesRequestedCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {proj.approvalRatePercent}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {proj.averageScore !== null ? `${proj.averageScore} / ${proj.maxScore}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                          <Link href={`/batches/${batch.id}/projects?assignmentId=${proj.assignmentId}`}>
                            <span>Evaluate</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 4: EXTERNAL ASSESSMENTS
        ========================================================================= */}
        <TabsContent value="external" className="space-y-4">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by assessment code, name, provider..."
                    className="pl-8 h-9 text-xs"
                    value={externalSearch}
                    onChange={(e) => setExternalSearch(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select value={externalProviderFilter} onValueChange={setExternalProviderFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {distinctProviders.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(externalSearch || externalProviderFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs px-2.5"
                    onClick={() => {
                      setExternalSearch('');
                      setExternalProviderFilter('all');
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredExternal.length === 0 ? (
            <Card className="shadow-sm">
              <EmptyState
                icon={Award}
                title="No external assessment benchmarks"
                description={
                  externalAssessmentPerformance.length === 0
                    ? 'No external assessment CSV results have been imported for this batch yet.'
                    : 'No external records match your search keywords or provider filter.'
                }
              />
            </Card>
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                    <TableHead>External Assessment</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead className="text-right">Cohort Coverage</TableHead>
                    <TableHead className="text-right">Average Score</TableHead>
                    <TableHead className="text-right">Average %</TableHead>
                    <TableHead className="text-right">Peak Score</TableHead>
                    <TableHead className="text-right">Percentile</TableHead>
                    <TableHead>Tiers (Elite / Adv / Prof / Dev)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExternal.map((ext) => (
                    <TableRow key={ext.assessmentCode} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{ext.assessmentName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{ext.assessmentCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {ext.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {ext.recordsCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {ext.participationRatePercent}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {ext.averageScore} / {ext.maxScore}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {ext.averagePercentage}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {ext.highestScore}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {ext.averagePercentile !== null ? `${ext.averagePercentile}%ile` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-500/40 text-purple-700 dark:text-purple-400">
                            {ext.tierCounts.elite}
                          </Badge>
                          <span>/</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-500/40 text-blue-700 dark:text-blue-400">
                            {ext.tierCounts.advanced}
                          </Badge>
                          <span>/</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                            {ext.tierCounts.proficient}
                          </Badge>
                          <span>/</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/40 text-amber-700 dark:text-amber-400">
                            {ext.tierCounts.developing}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                          <Link href={`/batches/${batch.id}/external-assessments?assessmentCode=${ext.assessmentCode}`}>
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 5: NEEDS ATTENTION (INTERVENTION ENGINE)
        ========================================================================= */}
        <TabsContent value="attention" className="space-y-4">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name, roll no, email..."
                    className="pl-8 h-9 text-xs"
                    value={attentionSearch}
                    onChange={(e) => setAttentionSearch(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select value={attentionCategoryFilter} onValueChange={setAttentionCategoryFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="quiz">Assessment Issues</SelectItem>
                      <SelectItem value="project">Project Revisions/Overdue</SelectItem>
                      <SelectItem value="external">Missing External Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(attentionSearch || attentionCategoryFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs px-2.5"
                    onClick={() => {
                      setAttentionSearch('');
                      setAttentionCategoryFilter('all');
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {filteredAttention.length === 0 ? (
            <Card className="shadow-sm">
              <EmptyState
                icon={CheckCircle2}
                title="All cohort students on track"
                description={
                  needsAttention.length === 0
                    ? 'No students currently trigger academic intervention rules (no failed quizzes, overdue projects, or missing attempts).'
                    : 'No students match your search or category filter.'
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAttention.map((stu) => (
                <Card key={stu.studentId} className="border shadow-sm p-4 hover:border-destructive/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{stu.studentName}</span>
                        {stu.collegeRollNumber && (
                          <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                            {stu.collegeRollNumber}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{stu.studentEmail}</span>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {stu.issues.map((iss, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={
                                iss.severity === 'high'
                                  ? 'border-destructive/40 text-destructive bg-destructive/5 text-[10px] px-1.5 py-0'
                                  : 'border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/5 text-[10px] px-1.5 py-0'
                              }
                            >
                              {iss.title}
                            </Badge>
                            <span className="text-muted-foreground">{iss.details}</span>
                            <Link
                              href={iss.actionUrl}
                              className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1 font-medium"
                            >
                              <span>Take Action</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 6: REPORTS & CSV EXPORTS
        ========================================================================= */}
        <TabsContent value="exports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Report 1: Executive Summary */}
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Cohort Executive Summary
                </CardTitle>
                <CardDescription className="text-xs">
                  High-level institutional KPI summary across enrollments, quizzes, projects, and external testing.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  className="w-full text-xs gap-1.5"
                  onClick={() => handleExport('summary', 'Cohort Executive Summary')}
                  disabled={exportingReport !== null}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingReport === 'summary' ? 'Exporting...' : 'Export Summary CSV'}
                </Button>
              </CardContent>
            </Card>

            {/* Report 2: Assessment Performance */}
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-violet-600" />
                  Assessment Performance Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed analytics for each assigned quiz including pass rates, attempt counts, and average percentages.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                  onClick={() => handleExport('assessments', 'Assessment Performance Report')}
                  disabled={exportingReport !== null}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingReport === 'assessments' ? 'Exporting...' : 'Export Assessments CSV'}
                </Button>
              </CardContent>
            </Card>

            {/* Report 3: Project Performance */}
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-amber-600" />
                  Project Milestone Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Cohort progress metrics, approval rates, revision requirements, and submission averages per milestone.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                  onClick={() => handleExport('projects', 'Project Milestone Report')}
                  disabled={exportingReport !== null}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingReport === 'projects' ? 'Exporting...' : 'Export Projects CSV'}
                </Button>
              </CardContent>
            </Card>

            {/* Report 4: External Assessment */}
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  External Testing Benchmarks
                </CardTitle>
                <CardDescription className="text-xs">
                  Third-party provider assessment analytics, percentile distributions, and performance tiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs gap-1.5"
                  onClick={() => handleExport('external', 'External Testing Report')}
                  disabled={exportingReport !== null}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingReport === 'external' ? 'Exporting...' : 'Export External CSV'}
                </Button>
              </CardContent>
            </Card>

            {/* Report 5: Needs Attention */}
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Needs Attention Roster
                </CardTitle>
                <CardDescription className="text-xs">
                  Export actionable roster of students flagged for failed tests, overdue projects, or inactivity.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleExport('needs_attention', 'Needs Attention Roster')}
                  disabled={exportingReport !== null}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingReport === 'needs_attention' ? 'Exporting...' : 'Export Intervention CSV'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
