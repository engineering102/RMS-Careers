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
  let titleText = 'Dedicated Workspace Required';
  let descriptionText = 'This content item is accessed through its dedicated learning workspace.';
  let actionLabel = 'Go to Workspace';
  let actionHref = '/library';
  let Icon = HelpCircle;
  let iconClass = 'text-primary bg-primary/10 border-primary/20';

  if (contentType === 'dsa_sheet') {
    titleText = 'DSA Practice Sheet';
    descriptionText =
      'DSA problem sets and practice tracking are managed directly within the DSA Practice Center.';
    actionLabel = 'Open DSA Practice Center';
    actionHref = '/dsa';
    Icon = Code2;
    iconClass = 'text-success bg-success/10 border-success/20';
  } else if (contentType === 'quiz') {
    titleText = 'Assessment Quiz';
    descriptionText =
      'Practice knowledge checks and formal timed exams are administered through the Assessment Suite.';
    actionLabel = 'Go to Assessments';
    actionHref = '/assessments';
    Icon = HelpCircle;
    iconClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  } else if (contentType === 'project') {
    titleText = 'Project Assignment';
    descriptionText =
      'Project briefs, GitHub submissions, and tutor reviews are managed within the Project Workspace.';
    actionLabel = 'Go to Projects & Assessments';
    actionHref = '/assessments';
    Icon = FolderGit2;
    iconClass = 'text-warning bg-warning/10 border-warning/20';
  }

  return (
    <Card className="border-border bg-card/60">
      <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center space-y-4 max-w-xl mx-auto">
        <div className={`p-3.5 rounded-xl border ${iconClass}`}>
          <Icon className="h-8 w-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-foreground">{titleText}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description || descriptionText}
          </p>
        </div>

        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 mt-2">
          <Link href={actionHref}>
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
