import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import {
  getContentItemById,
  getOrCreateQuizForContentItem
} from '@/lib/db/queries';
import { QuizAuthoringClient } from './quiz-authoring-client';
import { requireAdminSession } from '@/lib/authz';

export const metadata = {
  title: 'Quiz & Assessment Authoring | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

export default async function QuizAuthoringPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();

  const params = await props.params;
  const { id } = params;

  const contentItem = await getContentItemById(id);
  if (!contentItem) {
    notFound();
  }

  if (contentItem.contentType !== 'quiz') {
    redirect('/content');
  }

  const quiz = await getOrCreateQuizForContentItem(id);

  return (
    <QuizAuthoringClient
      contentItem={contentItem}
      initialQuiz={quiz}
    />
  );
}
