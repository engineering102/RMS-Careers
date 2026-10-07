'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  FolderGit2,
  FileQuestion,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Users,
  Award,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  MessageSquare,
  Sparkles
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
  getSubmissionDetailsAction,
  updateSubmissionReviewAction,
  validateGithubRepoAction
} from './actions';
import type {
  BatchProjectOverviewItem,
  ProjectSubmissionListItem,
  ProjectSubmissionInspectorDetails
} from '@/lib/db/queries';
import type { GithubValidationResult } from '@/lib/services/github-validator';
import type { Batch, College, Program, SubmissionStatusEnum } from '@rms/db';

interface BatchProjectsClientProps {
  batch: Batch;
  college: College | null;
  program: Program | null;
  overviewItems: BatchProjectOverviewItem[];
  initialSubmissions: ProjectSubmissionListItem[];
  initialAssignmentId?: string;
}

export function BatchProjectsClient({
  batch,
  college,
  program,
  overviewItems,
  initialSubmissions,
  initialAssignmentId
}: BatchProjectsClientProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string>(
    initialAssignmentId || 'all'
  );
  const [submissions, setSubmissions] = React.useState<ProjectSubmissionListItem[]>(initialSubmissions);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Inspector Dialog state
  const [inspectorOpen, setInspectorOpen] = React.useState<boolean>(false);
  const [activeSubmissionId, setActiveSubmissionId] = React.useState<string | null>(null);
  const [submissionDetails, setSubmissionDetails] = React.useState<ProjectSubmissionInspectorDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState<boolean>(false);

  // Evaluation Form state
  const [reviewScore, setReviewScore] = React.useState<string>('');
  const [reviewFeedback, setReviewFeedback] = React.useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState<boolean>(false);

  // GitHub Validation state
  const [githubValidation, setGithubValidation] = React.useState<GithubValidationResult | null>(null);
  const [isValidatingGithub, setIsValidatingGithub] = React.useState<boolean>(false);

  // Overall batch statistics
  const totalAssigned = overviewItems.length;
  const totalSubmissions = overviewItems.reduce((acc, item) => acc + item.totalSubmissionsCount, 0);
  const totalSubmitted = overviewItems.reduce((acc, item) => acc + item.submittedCount, 0);
  const totalUnderReview = overviewItems.reduce((acc, item) => acc + item.underReviewCount, 0);
  const totalChangesRequested = overviewItems.reduce((acc, item) => acc + item.changesRequestedCount, 0);
  const totalApproved = overviewItems.reduce((acc, item) => acc + item.approvedCount, 0);

  // Filtered submissions list
  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      // Assignment filter
      if (selectedAssignmentId !== 'all' && sub.assignmentId !== selectedAssignmentId) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && sub.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = sub.studentName.toLowerCase().includes(query);
        const matchesEmail = sub.studentEmail.toLowerCase().includes(query);
        const matchesRoll = sub.collegeRollNumber?.toLowerCase().includes(query) || false;
        const matchesGithub = sub.githubUrl.toLowerCase().includes(query);
        const matchesProject = sub.projectTitle.toLowerCase().includes(query);

        if (!matchesName && !matchesEmail && !matchesRoll && !matchesGithub && !matchesProject) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, selectedAssignmentId, statusFilter, searchQuery]);

  // Open inspector
  const handleOpenInspector = async (submissionId: string) => {
    setActiveSubmissionId(submissionId);
    setInspectorOpen(true);
    setIsLoadingDetails(true);
    setGithubValidation(null);

    try {
      const res = await getSubmissionDetailsAction(batch.id, submissionId);
      if (!res.success) {
        toast.error(res.error || 'Failed to load submission details.');
        setInspectorOpen(false);
        return;
      }

      setSubmissionDetails(res.data);
      setReviewScore(res.data.score !== null ? String(res.data.score) : '');
      setReviewFeedback(res.data.tutorFeedback || '');

      // Trigger automatic background GitHub validation
      if (res.data.githubUrl) {
        handleValidateGithub(res.data.githubUrl);
      }
    } catch {
      toast.error('An unexpected error occurred while fetching details.');
      setInspectorOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Run GitHub repository validation
  const handleValidateGithub = async (url: string) => {
    setIsValidatingGithub(true);
    try {
      const res = await validateGithubRepoAction(url);
      if (res.success) {
        setGithubValidation(res.data);
      } else {
        toast.error(res.error || 'Failed to validate GitHub repository.');
      }
    } catch {
      // Non-fatal validation error
    } finally {
      setIsValidatingGithub(false);
    }
  };

  // Execute review lifecycle transition
  const handleExecuteTransition = async (newStatus: SubmissionStatusEnum) => {
    if (!submissionDetails) return;

    if (newStatus === 'resubmission_requested' && !reviewFeedback.trim()) {
      toast.error('Structured feedback is required when requesting changes.');
      return;
    }

    let parsedScore: number | null = null;
    if (reviewScore.trim() !== '') {
      parsedScore = parseInt(reviewScore.trim(), 10);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > submissionDetails.maxScore) {
        toast.error(`Score must be a number between 0 and ${submissionDetails.maxScore}.`);
        return;
      }
    }

    if (newStatus === 'approved' && parsedScore === null) {
      toast.error('Please assign a score before approving this submission.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await updateSubmissionReviewAction(batch.id, submissionDetails.submissionId, {
        newStatus,
        score: parsedScore,
        feedback: reviewFeedback.trim() || null
      });

      if (!res.success) {
        toast.error(res.error || 'Failed to update review status.');
        return;
      }

      toast.success(res.message || `Submission status updated to ${newStatus}.`);

      // Update local state in table list
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.submissionId === submissionDetails.submissionId) {
            return {
              ...s,
              status: newStatus,
              score: parsedScore !== null ? parsedScore : s.score,
              tutorFeedback: reviewFeedback.trim() || s.tutorFeedback,
              reviewedAt: new Date()
            };
          }
          return s;
        })
      );

      // Refresh inspector details
      const refreshed = await getSubmissionDetailsAction(batch.id, submissionDetails.submissionId);
      if (refreshed.success) {
        setSubmissionDetails(refreshed.data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update submission.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper badge for submission lifecycle status
  const getStatusBadge = (status: SubmissionStatusEnum) => {
    switch (status) {
      case 'submitted':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
            <Clock className="h-3 w-3" />
            Submitted / Awaiting Review
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1">
            <Eye className="h-3 w-3" />
            Under Review
          </Badge>
        );
      case 'resubmission_requested':
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Changes Requested
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
            <span>Project Evaluation</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Project Evaluation Workbench</h1>
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

        {/* Shortcuts */}
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5 text-xs shadow-sm">
            <Link href={`/batches/${batch.id}/assessments`}>
              <FileQuestion className="h-3.5 w-3.5 text-violet-600" />
              <span>Assessments</span>
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

      {/* 2. Summary Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Assigned Projects</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalAssigned}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
            In Curriculum
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium">Total Submissions</CardDescription>
            <CardTitle className="text-2xl font-bold">{totalSubmissions}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            From Cohort
          </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-500/20 bg-amber-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Awaiting Review
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-800 dark:text-amber-300">
              {totalSubmitted}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-amber-700/80 dark:text-amber-400/80 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Needs Attention
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-500/20 bg-blue-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Under Review
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-300">
              {totalUnderReview}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-blue-700/80 dark:text-blue-400/80 flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            In Evaluation
          </CardContent>
        </Card>

        <Card className="shadow-sm border-orange-500/20 bg-orange-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-orange-700 dark:text-orange-400">
              Changes Requested
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-orange-800 dark:text-orange-300">
              {totalChangesRequested}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-orange-700/80 dark:text-orange-400/80 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Awaiting Student
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Approved
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
              {totalApproved}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-emerald-700/80 dark:text-emerald-400/80 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Passed Review
          </CardContent>
        </Card>
      </div>

      {/* 3. Project Filter Cards / Selector */}
      {overviewItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Assigned Projects</h2>
            <span className="text-xs text-muted-foreground">
              Select a project to narrow down submissions
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* "All Projects" Option */}
            <button
              type="button"
              onClick={() => setSelectedAssignmentId('all')}
              className={`flex flex-col text-left p-3.5 rounded-lg border transition-all text-xs ${
                selectedAssignmentId === 'all'
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                  : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-sm">All Assigned Projects</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {totalSubmissions} Subs
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-[11px] line-clamp-1">
                Viewing submissions across all assigned projects
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="text-amber-600 font-medium">{totalSubmitted} pending</span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">{totalApproved} approved</span>
              </div>
            </button>

            {overviewItems.map((item) => (
              <button
                key={item.assignmentId}
                type="button"
                onClick={() => setSelectedAssignmentId(item.assignmentId)}
                className={`flex flex-col text-left p-3.5 rounded-lg border transition-all text-xs ${
                  selectedAssignmentId === item.assignmentId
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm line-clamp-1">{item.title}</span>
                  <Badge variant="secondary" className="font-mono text-[10px] shrink-0">
                    W{item.weekNumber}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-[11px] line-clamp-1">
                  Max: {item.maxScore} pts • {item.rubricCriteria.length} criteria
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">{item.totalSubmissionsCount} subs</span>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">{item.submittedCount} pending</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-medium">{item.approvedCount} approved</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Submission Queue & Filter Toolbar */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>Submissions Queue</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {filteredSubmissions.length} of {submissions.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Review and evaluate code repositories, student notes, and live deployments
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search student, roll, repo..."
                  className="h-8 pl-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resubmission_requested">Changes Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== 'all' || selectedAssignmentId !== 'all') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setSelectedAssignmentId('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredSubmissions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FolderGit2}
                title="No Submissions Found"
                description={
                  submissions.length === 0
                    ? 'No students have submitted project assignments for this batch yet.'
                    : 'No submissions matched your search and filter criteria.'
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Student</TableHead>
                  <TableHead className="text-xs font-semibold">Project Assignment</TableHead>
                  <TableHead className="text-xs font-semibold">Repository</TableHead>
                  <TableHead className="text-xs font-semibold">Submitted At</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Score</TableHead>
                  <TableHead className="text-xs font-semibold">Reviewer</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((sub) => (
                  <TableRow key={sub.submissionId} className="hover:bg-muted/40">
                    {/* Student */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs text-foreground">
                          {sub.studentName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>{sub.studentEmail}</span>
                          {sub.collegeRollNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{sub.collegeRollNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Project */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium line-clamp-1">{sub.projectTitle}</span>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
                            Week {sub.weekNumber}
                          </Badge>
                          <span>Max: {sub.maxScore}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Repository */}
                    <TableCell>
                      <a
                        href={sub.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                      >
                        <FolderGit2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {sub.githubUrl.replace('https://github.com/', '')}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                      </a>
                    </TableCell>

                    {/* Submitted At */}
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{formatDate(sub.submittedAt)}</span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">{getStatusBadge(sub.status)}</TableCell>

                    {/* Score */}
                    <TableCell className="text-center">
                      {sub.score !== null ? (
                        <span className="font-mono font-medium text-xs">
                          {sub.score} / {sub.maxScore}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">— / {sub.maxScore}</span>
                      )}
                    </TableCell>

                    {/* Reviewer */}
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.reviewedByTutorName ? (
                        <span className="font-medium text-foreground">{sub.reviewedByTutorName}</span>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 shadow-xs"
                        onClick={() => handleOpenInspector(sub.submissionId)}
                      >
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span>Evaluate</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 5. Submission Inspector / Workbench Modal Dialog */}
      <Dialog open={inspectorOpen} onOpenChange={setInspectorOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          {isLoadingDetails || !submissionDetails ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading submission details...</p>
            </div>
          ) : (
            <>
              {/* Modal Header */}
              <div className="p-6 border-b flex flex-wrap items-center justify-between gap-3 bg-muted/20">
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold">
                      {submissionDetails.projectTitle}
                    </DialogTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      Week {submissionDetails.weekNumber}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    Student: <strong className="text-foreground">{submissionDetails.studentName}</strong> ({submissionDetails.studentEmail})
                    {submissionDetails.collegeRollNumber && (
                      <span className="font-mono ml-1.5">• Roll: {submissionDetails.collegeRollNumber}</span>
                    )}
                  </DialogDescription>
                </div>

                <div>{getStatusBadge(submissionDetails.status)}</div>
              </div>

              {/* Modal Body */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Submission Artifacts & Metadata */}
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Project Specification
                    </h3>
                    <div className="rounded-lg border p-3.5 bg-card text-xs flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{submissionDetails.projectTitle}</span>
                        <span className="font-mono font-semibold">Max: {submissionDetails.maxScore} pts</span>
                      </div>
                      {submissionDetails.projectDescription && (
                        <p className="text-muted-foreground line-clamp-3">
                          {submissionDetails.projectDescription}
                        </p>
                      )}
                      {submissionDetails.dueAt && (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] pt-1 border-t">
                          <Calendar className="h-3 w-3" />
                          <span>Deadline: {formatDate(submissionDetails.dueAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rubric Criteria (if available) */}
                  {submissionDetails.rubricCriteria.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Evaluation Rubric ({submissionDetails.rubricCriteria.length} Criteria)
                      </h3>
                      <div className="rounded-lg border divide-y text-xs bg-card">
                        {submissionDetails.rubricCriteria.map((c, idx) => (
                          <div key={c.id || idx} className="p-2.5 flex items-start justify-between gap-2">
                            <div>
                              <span className="font-medium text-foreground">{c.title}</span>
                              {c.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{c.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                              {c.maxPoints} pts
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Submissions URLs */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Submitted Repositories & Artifacts
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {/* GitHub Repository */}
                      <div className="rounded-lg border p-3 bg-card flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-medium">
                            <FolderGit2 className="h-4 w-4 text-primary" />
                            <span>GitHub Repository</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] gap-1"
                            disabled={isValidatingGithub}
                            onClick={() => handleValidateGithub(submissionDetails.githubUrl)}
                          >
                            <RefreshCw className={`h-2.5 w-2.5 ${isValidatingGithub ? 'animate-spin' : ''}`} />
                            Verify
                          </Button>
                        </div>

                        <a
                          href={submissionDetails.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-primary hover:underline break-all inline-flex items-center gap-1"
                        >
                          <span>{submissionDetails.githubUrl}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>

                        {/* GitHub Validation Output Card */}
                        {githubValidation && (
                          <div
                            className={`rounded-md p-2.5 text-xs border flex flex-col gap-1 ${
                              githubValidation.valid
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                : 'bg-destructive/10 border-destructive/30 text-destructive'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-medium">
                              {githubValidation.valid ? (
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ShieldAlert className="h-4 w-4 text-destructive" />
                              )}
                              <span>
                                {githubValidation.valid
                                  ? 'Public Repository Accessible'
                                  : 'Repository Inaccessible / Private'}
                              </span>
                            </div>
                            {githubValidation.reason && (
                              <p className="text-[11px] opacity-90">{githubValidation.reason}</p>
                            )}
                            {githubValidation.parsedInfo && (
                              <div className="flex items-center gap-2 text-[10px] opacity-80 pt-1 font-mono">
                                {githubValidation.parsedInfo.owner && (
                                  <span>Owner: {githubValidation.parsedInfo.owner}</span>
                                )}
                                {githubValidation.parsedInfo.repo && (
                                  <span>Repo: {githubValidation.parsedInfo.repo}</span>
                                )}
                                {githubValidation.parsedInfo.isPullRequest && (
                                  <span className="flex items-center gap-0.5">
                                    <GitPullRequest className="h-2.5 w-2.5" />
                                    PR #{githubValidation.parsedInfo.pullNumber}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Live Demo URL */}
                      {submissionDetails.liveUrl && (
                        <div className="rounded-lg border p-3 bg-card flex flex-col gap-1 text-xs">
                          <span className="text-muted-foreground font-medium text-[11px]">Live Deployment</span>
                          <a
                            href={submissionDetails.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-primary hover:underline break-all inline-flex items-center gap-1"
                          >
                            <span>{submissionDetails.liveUrl}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Student Notes */}
                      {submissionDetails.notes && (
                        <div className="rounded-lg border p-3 bg-card flex flex-col gap-1 text-xs">
                          <span className="text-muted-foreground font-medium text-[11px]">Student Notes</span>
                          <p className="text-foreground whitespace-pre-wrap">{submissionDetails.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Evaluation Controls & Structured Feedback */}
                <div className="flex flex-col gap-5 border-t md:border-t-0 md:border-l md:pl-6 pt-5 md:pt-0">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Evaluation Control Plane
                    </h3>

                    {/* Current status callout banner */}
                    <div className="rounded-lg border p-3.5 bg-muted/30 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Current State</span>
                        {getStatusBadge(submissionDetails.status)}
                      </div>

                      <p className="text-muted-foreground text-[11px]">
                        {submissionDetails.status === 'submitted' &&
                          'This submission has been submitted by the student and is awaiting review.'}
                        {submissionDetails.status === 'under_review' &&
                          'This submission is actively under review by academic tutors / admins.'}
                        {submissionDetails.status === 'resubmission_requested' &&
                          'Changes were requested. Waiting for the student to push updates and resubmit.'}
                        {submissionDetails.status === 'approved' &&
                          'This project submission has been approved and marked as successfully completed.'}
                      </p>

                      {submissionDetails.reviewedByTutorName && (
                        <div className="pt-2 border-t mt-1 text-[11px] text-muted-foreground">
                          Evaluated by: <strong className="text-foreground">{submissionDetails.reviewedByTutorName}</strong>
                          {submissionDetails.reviewedAt && (
                            <span> on {formatDate(submissionDetails.reviewedAt)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previous / Existing Feedback Display */}
                  {submissionDetails.tutorFeedback && submissionDetails.status !== 'under_review' && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Previous Feedback</h4>
                      <div className="rounded-lg border p-3 text-xs bg-card whitespace-pre-wrap text-foreground">
                        {submissionDetails.tutorFeedback}
                      </div>
                    </div>
                  )}

                  {/* Evaluation Form for 'under_review' or starting review */}
                  {submissionDetails.status === 'submitted' && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                        <Eye className="h-4 w-4" />
                        <span>Ready to Begin Evaluation</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Clicking &quot;Start Review&quot; transitions this submission to &quot;under_review&quot; and locks it against conflicting student edits.
                      </p>
                      <Button
                        size="sm"
                        disabled={isSubmittingReview}
                        onClick={() => handleExecuteTransition('under_review')}
                        className="w-full gap-1.5 shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Start Review</span>
                      </Button>
                    </div>
                  )}

                  {submissionDetails.status === 'under_review' && (
                    <div className="flex flex-col gap-4">
                      {/* Score Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Score (Max: {submissionDetails.maxScore})</span>
                          <span className="text-[10px] text-muted-foreground">Required for Approval</span>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={submissionDetails.maxScore}
                          placeholder={`Enter score (0 - ${submissionDetails.maxScore})`}
                          value={reviewScore}
                          onChange={(e) => setReviewScore(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      {/* Structured Feedback Textarea */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Evaluator Feedback & Code Review Notes</span>
                          <span className="text-[10px] text-muted-foreground">Required for Changes</span>
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Provide constructive feedback, code architecture notes, test coverage feedback, or specific revisions required..."
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>

                      {/* Action Transition Buttons */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSubmittingReview}
                          onClick={() => handleExecuteTransition('resubmission_requested')}
                          className="h-9 gap-1.5 text-xs border-orange-500/40 text-orange-700 hover:bg-orange-500/10 dark:text-orange-400"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Request Changes</span>
                        </Button>

                        <Button
                          size="sm"
                          disabled={isSubmittingReview}
                          onClick={() => handleExecuteTransition('approved')}
                          className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve Project</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {submissionDetails.status === 'resubmission_requested' && (
                    <div className="flex flex-col gap-3">
                      <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3.5 text-xs flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 font-semibold">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Changes Requested</span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          The student has been notified and can update their repository before resubmitting.
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSubmittingReview}
                        onClick={() => handleExecuteTransition('under_review')}
                        className="w-full gap-1.5 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Re-open Review</span>
                      </Button>
                    </div>
                  )}

                  {submissionDetails.status === 'approved' && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-2 text-xs">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Project Approved</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span>Final Score:</span>
                        <strong className="text-emerald-700 dark:text-emerald-300">
                          {submissionDetails.score} / {submissionDetails.maxScore} pts
                        </strong>
                      </div>
                      {submissionDetails.tutorFeedback && (
                        <div className="pt-2 border-t border-emerald-500/20 text-muted-foreground">
                          <span className="font-medium text-foreground">Feedback:</span> {submissionDetails.tutorFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-muted/20 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInspectorOpen(false)}
                  className="h-8 text-xs"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
