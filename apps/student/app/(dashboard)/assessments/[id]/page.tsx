import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import {
  getAssessmentType,
  getPracticeQuizForRunner,
  getFormalAssessmentForRunner
} from '@/lib/db/queries/assessments';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { PracticeQuizRunner } from '@/components/assessments/practice-quiz-runner';
import { FormalAssessmentRunner } from '@/components/assessments/formal-assessment-runner';

interface AssessmentPageProps {
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
}: AssessmentPageProps): Promise<Metadata> {
  const { id } = await params;
  const { batchId } = await searchParams;
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return {
      title: 'Assessment — RMS Student Portal'
    };
  }

  try {
    const assessmentType = await getAssessmentType(id);
    if (assessmentType === 'formal') {
      const formalData = await getFormalAssessmentForRunner(context.student.id, id, batchId);
      return {
        title: `${formalData.title} — Formal Assessment`,
        description: formalData.description || 'Timed formal cohort examination.'
      };
    } else if (assessmentType === 'practice') {
      const practiceData = await getPracticeQuizForRunner(context.student.id, id, batchId);
      return {
        title: `${practiceData.title} — Practice Assessment`,
        description: practiceData.description || 'Self-paced practice knowledge check.'
      };
    }
  } catch {
    // Fall through to default metadata
  }

  return {
    title: 'Assessment — RMS Student Portal'
  };
}

export default async function AssessmentPage({
  params,
  searchParams
}: AssessmentPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { id } = await params;
  const { batchId } = await searchParams;

  // Determine assessment type server-authoritatively
  const assessmentType = await getAssessmentType(id);

  if (assessmentType === 'formal') {
    // Formal Timed Assessment (Slice 12)
    const formalData = await getFormalAssessmentForRunner(
      context.student.id,
      id,
      batchId
    );

    return <FormalAssessmentRunner initialData={formalData} />;
  } else if (assessmentType === 'practice') {
    // Practice Knowledge Check (Slice 11)
    const practiceData = await getPracticeQuizForRunner(
      context.student.id,
      id,
      batchId
    );

    return (
      <PracticeQuizRunner
        quiz={practiceData}
        initialBatchId={batchId}
      />
    );
  }

  // If unrecognized, unentitled, or nonexistent, anti-probing triggers notFound()
  notFound();
}
