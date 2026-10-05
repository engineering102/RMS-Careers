import React from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import {
  getStudentPracticeQuizzes,
  getStudentFormalAssessments
} from '@/lib/db/queries/assessments';
import { getStudentProjectAssignments } from '@/lib/db/queries/projects';
import { getStudentExternalAssessments } from '@/lib/db/queries/external-assessments';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { AssessmentsHeader } from '@/components/assessments/assessments-header';
import { PracticeQuizCard } from '@/components/assessments/practice-quiz-card';
import { FormalAssessmentCard } from '@/components/assessments/formal-assessment-card';
import { ProjectAssignmentCard } from '@/components/projects/project-assignment-card';
import { ExternalAssessmentCard } from '@/components/assessments/external-assessment-card';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, Timer, FolderGit2, Award } from 'lucide-react';

export const metadata = {
  title: 'Assessments & Practice Checks — RMS Student Portal',
  description: 'Timed formal cohort examinations and self-paced practice knowledge checks.'
};

export default async function AssessmentsPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const [formalAssessments, practiceQuizzes, projectAssignments, externalAssessments] =
    await Promise.all([
      getStudentFormalAssessments(context.student.id),
      getStudentPracticeQuizzes(context.student.id),
      getStudentProjectAssignments(context.student.id),
      getStudentExternalAssessments(context.student.id)
    ]);

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12">
      {/* 1. Unified Assessment Center Header with aggregated metrics */}
      <AssessmentsHeader
        quizzes={practiceQuizzes}
        formalAssessments={formalAssessments}
      />

      {/* 2. Formal Timed Assessments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-400" />
              <span>Formal Timed Assessments</span>
            </h2>
            <p className="text-xs text-slate-400">
              Scheduled examinations with authoritative countdown timers and single-attempt lifecycle.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {formalAssessments.length}{' '}
            {formalAssessments.length === 1 ? 'assessment' : 'assessments'}
          </span>
        </div>

        {formalAssessments.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-8 text-center space-y-2.5">
              <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <Timer className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                No Formal Assessments Scheduled
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                There are currently no formal examinations scheduled in your active batch timelines.
                New assessments will unlock as your cohort reaches curriculum milestones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formalAssessments.map((assessment) => (
              <FormalAssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        )}
      </div>

      {/* 3. Practice Knowledge Checks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-purple-400" />
              <span>Practice Knowledge Checks</span>
            </h2>
            <p className="text-xs text-slate-400">
              Untimed quizzes with instant explanations, repeatable practice, and placement preparation.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {practiceQuizzes.length}{' '}
            {practiceQuizzes.length === 1 ? 'assessment' : 'assessments'}
          </span>
        </div>

        {practiceQuizzes.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-8 text-center space-y-2.5">
              <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                No Practice Knowledge Checks Available
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                There are currently no practice knowledge checks assigned to your enrolled programs.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {practiceQuizzes.map((quiz) => (
              <PracticeQuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </div>

      {/* 4. Project Assignments Section (Slice 13) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-amber-400" />
              <span>Project Assignments</span>
            </h2>
            <p className="text-xs text-slate-400">
              Industry-grade project deliverables evaluated against git workflows and technical rubrics.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {projectAssignments.length}{' '}
            {projectAssignments.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {projectAssignments.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-8 text-center space-y-2.5">
              <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                No Project Deliverables Assigned
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Project assignments and repository submission briefs will appear here as your batch progresses.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projectAssignments.map((project) => (
              <ProjectAssignmentCard
                key={`${project.contentItemId}-${project.batchId}`}
                project={project}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. External Standardized Assessments Section (Slice 14) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-400" />
              <span>External Standardized Assessments</span>
            </h2>
            <p className="text-xs text-slate-400">
              Official standardized placement benchmarks and third-party proctored test report cards.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {externalAssessments.length}{' '}
            {externalAssessments.length === 1 ? 'report card' : 'report cards'}
          </span>
        </div>

        {externalAssessments.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-8 text-center space-y-2.5">
              <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                No External Assessments Ingested
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Standardized test scores conducted on partner assessment platforms (such as HackerEarth,
                AMCAT, or TCS iON) will appear here once verified and imported by administrators.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {externalAssessments.map((record) => (
              <ExternalAssessmentCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
