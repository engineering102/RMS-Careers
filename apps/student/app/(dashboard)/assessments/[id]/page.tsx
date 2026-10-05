import React from 'react';
import type { Metadata } from 'next';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getPracticeQuizForRunner } from '@/lib/db/queries/assessments';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { PracticeQuizRunner } from '@/components/assessments/practice-quiz-runner';

interface PracticeQuizPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    batchId?: string;
  }>;
}

export async function generateMetadata({
  params,
  searchParams
}: PracticeQuizPageProps): Promise<Metadata> {
  const { id } = await params;
  const { batchId } = await searchParams;
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return {
      title: 'Practice Assessment — RMS Student Portal'
    };
  }

  try {
    const quiz = await getPracticeQuizForRunner(context.student.id, id, batchId);
    return {
      title: `${quiz.title} — Practice Assessment`,
      description: quiz.description || 'Self-paced practice knowledge check with instant feedback.'
    };
  } catch {
    return {
      title: 'Practice Assessment — RMS Student Portal'
    };
  }
}

export default async function PracticeQuizPage({
  params,
  searchParams
}: PracticeQuizPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { id } = await params;
  const { batchId } = await searchParams;

  // Server-authoritative query (anti-probing: calls notFound() if unauthorized or nonexistent)
  const quizRunnerData = await getPracticeQuizForRunner(
    context.student.id,
    id,
    batchId
  );

  return (
    <PracticeQuizRunner
      quiz={quizRunnerData}
      initialBatchId={batchId}
    />
  );
}
