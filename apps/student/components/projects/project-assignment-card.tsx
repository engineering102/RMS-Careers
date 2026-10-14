import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderGit2,
  Clock,
  CheckCircle2,
  Lock,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import type { ProjectAssignmentCardData } from '@/lib/types/projects';
import { formatDate } from '@/lib/format/datetime';

interface ProjectAssignmentCardProps {
  project: ProjectAssignmentCardData;
}

export function ProjectAssignmentCard({ project }: ProjectAssignmentCardProps) {
  const status = project.submission?.status || 'draft';

  const getStatusBadge = () => {
    switch (status) {
      case 'submitted':
        return (
          <Badge className="border-primary/30 bg-primary/10 text-primary gap-1 text-[11px] px-2 py-0.5">
            <Clock className="h-3 w-3" />
            <span>Submitted</span>
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="border-warning/30 bg-warning/10 text-warning gap-1 text-[11px] px-2 py-0.5">
            <Lock className="h-3 w-3" />
            <span>Under Review</span>
          </Badge>
        );
      case 'resubmission_requested':
        return (
          <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-300 gap-1 text-[11px] px-2 py-0.5">
            <RotateCcw className="h-3 w-3" />
            <span>Changes Requested</span>
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="border-success/30 bg-success/10 text-success gap-1 text-[11px] px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            <span>Approved {project.submission?.score !== null && `(${project.submission?.score}/${project.maxScore})`}</span>
          </Badge>
        );
      case 'draft':
      default:
        return (
          <Badge className="border-input bg-secondary text-muted-foreground gap-1 text-[11px] px-2 py-0.5">
            <FolderGit2 className="h-3 w-3" />
            <span>Not Submitted</span>
          </Badge>
        );
    }
  };

  const projectHref = `/content/${project.contentItemId}?batchId=${encodeURIComponent(project.batchId)}`;

  return (
    <Card className="border-border bg-card/60 hover:border-input transition-all">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              {project.batchName}
            </span>
            {getStatusBadge()}
          </div>

          <h3 className="text-base font-semibold text-foreground line-clamp-1">
            {project.title}
          </h3>

          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
            {project.dueAt ? (
              <>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Due: {formatDate(project.dueAt)}</span>
              </>
            ) : (
              <span>Cohort Milestone</span>
            )}
          </div>

          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-warning hover:text-warning hover:bg-warning/10 text-xs gap-1.5 px-3 h-8"
          >
            <Link href={projectHref}>
              <span>{project.submission ? 'View Workspace' : 'Submit Project'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
