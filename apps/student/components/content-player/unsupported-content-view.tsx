import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code2, HelpCircle, FolderGit2, ArrowRight } from 'lucide-react';
import type { ContentType } from '@/lib/types/library';

interface UnsupportedContentViewProps {
  contentType: ContentType;
  title: string;
  description: string | null;
}

export function UnsupportedContentView({
  contentType,
  title,
  description
}: UnsupportedContentViewProps) {
  let titleText = 'Opens elsewhere';
  let descriptionText = 'This item opens in its own part of the portal.';
  let actionLabel = 'Open library';
  let actionHref = '/library';
  let Icon = HelpCircle;

  if (contentType === 'dsa_sheet') {
    titleText = 'DSA practice sheet';
    descriptionText =
      'Problems and your progress on them live in DSA practice.';
    actionLabel = 'Open DSA practice';
    actionHref = '/dsa';
    Icon = Code2;
  } else if (contentType === 'quiz') {
    titleText = 'Quiz';
    descriptionText =
      'Quizzes and timed tests are taken from Tests.';
    actionLabel = 'Open tests';
    actionHref = '/assessments';
    Icon = HelpCircle;
  } else if (contentType === 'project') {
    titleText = 'Project';
    descriptionText =
      'Project briefs, submissions and tutor reviews are under Tests.';
    actionLabel = 'Open tests';
    actionHref = '/assessments';
    Icon = FolderGit2;
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="mx-auto flex max-w-xl flex-col items-center space-y-4 p-8 text-center sm:p-10">
        <Icon className="h-6 w-6 text-faint" aria-hidden="true" />

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">{titleText}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description || descriptionText}
          </p>
        </div>

        <Button asChild variant="outline" className="mt-2">
          <Link href={actionHref}>
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
