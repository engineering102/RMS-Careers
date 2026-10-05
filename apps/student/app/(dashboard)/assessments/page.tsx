import React from 'react';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getStudentPracticeQuizzes } from '@/lib/db/queries/assessments';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { AssessmentsHeader } from '@/components/assessments/assessments-header';
import { PracticeQuizCard } from '@/components/assessments/practice-quiz-card';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck } from 'lucide-react';

export const metadata = {
  title: 'Assessments & Practice Checks — RMS Student Portal',
  description: 'Self-paced practice knowledge checks and assessment readiness center.'
};

export default async function AssessmentsPage() {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const quizzes = await getStudentPracticeQuizzes(context.student.id);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Header with aggregated metrics */}
      <AssessmentsHeader quizzes={quizzes} />

      {/* 2. Practice Quizzes Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Practice Knowledge Checks
          </h2>
          <span className="text-xs text-slate-400">
            {quizzes.length} {quizzes.length === 1 ? 'assessment available' : 'assessments available'}
          </span>
        </div>

        {quizzes.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                No Practice Knowledge Checks Available
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                There are currently no practice knowledge checks assigned to your enrolled programs or cohorts.
                Check back as curriculum milestones are unlocked.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((quiz) => (
              <PracticeQuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
