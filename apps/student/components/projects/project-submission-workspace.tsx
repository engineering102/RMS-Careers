'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FolderGit2,
  Github,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  RotateCcw,
  ExternalLink,
  Send,
  Sparkles,
  Info,
  Laptop
} from 'lucide-react';
import { submitProjectAssignment } from '@/lib/actions/projects';
import type {
  ProjectAssignmentDetail,
  ProjectSubmissionStatus
} from '@/lib/types/projects';

interface ProjectSubmissionWorkspaceProps {
  assignment: ProjectAssignmentDetail;
}

export function ProjectSubmissionWorkspace({
  assignment
}: ProjectSubmissionWorkspaceProps) {
  const [submission, setSubmission] = useState(assignment.submission);
  const [githubUrl, setGithubUrl] = useState(assignment.submission?.githubUrl || '');
  const [liveUrl, setLiveUrl] = useState(assignment.submission?.liveUrl || '');
  const [notes, setNotes] = useState(assignment.submission?.notes || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const status: ProjectSubmissionStatus | 'draft' = submission?.status || 'draft';
  const isLocked = status === 'under_review' || status === 'approved';
  const canSubmit = !isLocked;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanGithub = githubUrl.trim();
    if (!cleanGithub) {
      setErrorMessage('Please provide a GitHub repository URL.');
      return;
    }

    startTransition(async () => {
      const res = await submitProjectAssignment({
        assignmentId: assignment.assignmentId,
        contentItemId: assignment.contentItemId,
        batchId: assignment.batchId,
        githubUrl: cleanGithub,
        liveUrl: liveUrl.trim() || null,
        notes: notes.trim() || null
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit project assignment.');
      } else {
        setSuccessMessage(res.message || 'Project submitted successfully.');
        setSubmission((prev) => ({
          id: res.data.submissionId,
          assignmentId: assignment.assignmentId,
          studentId: prev?.studentId || 0,
          batchId: assignment.batchId,
          githubUrl: cleanGithub,
          liveUrl: liveUrl.trim() || null,
          notes: notes.trim() || null,
          status: 'submitted',
          score: prev?.score ?? null,
          tutorFeedback: prev?.tutorFeedback ?? null,
          reviewedByTutorId: prev?.reviewedByTutorId ?? null,
          reviewedAt: prev?.reviewedAt ?? null,
          submittedAt: new Date(res.data.submittedAt),
          updatedAt: new Date(res.data.submittedAt),
          canResubmit: true
        }));
      }
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'submitted':
        return (
          <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300 gap-1 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Submitted for Review</span>
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-300 gap-1 px-3 py-1">
            <Lock className="h-3.5 w-3.5" />
            <span>Under Tutor Review</span>
          </Badge>
        );
      case 'resubmission_requested':
        return (
          <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300 gap-1 px-3 py-1">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Changes Requested</span>
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 gap-1 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Project Approved</span>
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge className="border-slate-700 bg-slate-800 text-slate-300 gap-1 px-3 py-1">
            <FolderGit2 className="h-3.5 w-3.5" />
            <span>Not Submitted</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Status Banner */}
      {status === 'approved' && (
        <div className="p-4 sm:p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 flex items-start gap-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5 text-emerald-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-emerald-200">
              Project Approved {submission?.score !== null && `• Score: ${submission?.score}/${assignment.maxScore}`}
            </h4>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Congratulations! Your project assignment has been reviewed and approved by the academic team.
            </p>
            {submission?.tutorFeedback && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/20 text-xs text-emerald-200">
                <span className="font-semibold block mb-1">Tutor Feedback:</span>
                {submission.tutorFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'under_review' && (
        <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 flex items-start gap-4">
          <Lock className="h-6 w-6 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-200">Review in Progress</h4>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              A tutor is actively evaluating your repository against the rubric. Resubmission is temporarily locked while evaluation is in progress.
            </p>
          </div>
        </div>
      )}

      {status === 'resubmission_requested' && (
        <div className="p-4 sm:p-5 rounded-xl border border-orange-500/30 bg-orange-950/20 text-orange-300 flex items-start gap-4">
          <RotateCcw className="h-6 w-6 shrink-0 mt-0.5 text-orange-400" />
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-bold text-orange-200">Action Required: Changes Requested</h4>
            <p className="text-xs text-orange-300/90 leading-relaxed">
              The reviewer has requested revisions before this project can be passed. Review the feedback below, make the necessary updates to your repository, and submit again.
            </p>
            {submission?.tutorFeedback && (
              <div className="mt-3 p-3.5 rounded-lg bg-orange-900/30 border border-orange-500/20 text-xs text-orange-200">
                <span className="font-semibold block mb-1">Reviewer Feedback:</span>
                {submission.tutorFeedback}
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'submitted' && (
        <div className="p-4 sm:p-5 rounded-xl border border-blue-500/30 bg-blue-950/20 text-blue-300 flex items-start gap-4">
          <Clock className="h-6 w-6 shrink-0 mt-0.5 text-blue-400" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-200">Submission Received</h4>
            <p className="text-xs text-blue-300/90 leading-relaxed">
              Your repository was submitted on{' '}
              {submission ? new Date(submission.submittedAt).toLocaleDateString() : 'recently'}. You may push updates and resubmit anytime until a tutor begins review.
            </p>
          </div>
        </div>
      )}

      {/* 2. Project Brief & Rubric Criteria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    {assignment.batchName}
                  </span>
                  <h2 className="text-xl font-bold text-slate-100">{assignment.title}</h2>
                </div>
                {getStatusBadge()}
              </div>

              {assignment.description && (
                <div className="pt-2 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {assignment.description}
                </div>
              )}

              {assignment.dueAt && (
                <div className="flex items-center gap-2 pt-2 text-xs text-slate-400 font-mono">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Deadline: {new Date(assignment.dueAt).toLocaleDateString()} at{' '}
                    {new Date(assignment.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Form */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-amber-400" />
                  <span>{submission ? 'Update Submission' : 'Submit Repository'}</span>
                </h3>
                <span className="text-xs text-slate-400">Public GitHub Repository</span>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Mobile ergonomics notice per Section 19 */}
              <div className="sm:hidden flex items-center gap-2 p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-xs text-slate-400">
                <Laptop className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Desktop recommended for GitHub repository submission</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* GitHub Repository URL */}
                <div className="space-y-1.5">
                  <label htmlFor="githubUrl" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Github className="h-3.5 w-3.5 text-slate-400" />
                    <span>GitHub Repository URL *</span>
                  </label>
                  <input
                    id="githubUrl"
                    type="url"
                    disabled={!canSubmit || isPending}
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username/project-name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    Must be a publicly accessible repository. The server validates accessibility via a HEAD request.
                  </p>
                </div>

                {/* Live Demo URL */}
                <div className="space-y-1.5">
                  <label htmlFor="liveUrl" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                    <span>Live Demo URL (Optional)</span>
                  </label>
                  <input
                    id="liveUrl"
                    type="url"
                    disabled={!canSubmit || isPending}
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://my-project.vercel.app"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  />
                </div>

                {/* Notes & Highlights */}
                <div className="space-y-1.5">
                  <label htmlFor="notes" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>Notes for Reviewer (Optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    disabled={!canSubmit || isPending}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Mention architecture decisions, environment variables setup, or specific features to test..."
                    maxLength={2000}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {submission && submission.githubUrl && (
                      <a
                        href={submission.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                      >
                        <span>View Current Repo</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit || isPending}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs gap-2 px-5 py-2"
                  >
                    {isPending ? (
                      <>
                        <Clock className="h-3.5 w-3.5 animate-spin" />
                        <span>Validating & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>{submission ? 'Update Submission' : 'Submit Assignment'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 3. Evaluation Rubric Sidebar */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span>Evaluation Rubric</span>
                </h3>
                <span className="text-xs font-mono font-bold text-purple-400">
                  {assignment.maxScore} Max Points
                </span>
              </div>

              {assignment.rubricCriteria.length === 0 ? (
                <p className="text-xs text-slate-400">General holistic project evaluation.</p>
              ) : (
                <div className="space-y-3">
                  {assignment.rubricCriteria.map((criterion, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">
                          {criterion.title}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-purple-300">
                          {criterion.maxPoints} pts
                        </span>
                      </div>
                      {criterion.description && (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {criterion.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  Projects are evaluated by industry tutors against clean code standards, git workflow, and functional completeness.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
