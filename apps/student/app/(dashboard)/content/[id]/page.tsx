import { notFound } from 'next/navigation';
import { requireStudentEntitlement } from '@/lib/db/queries/entitlements';
import { getContentItem } from '@/lib/db/queries/content';
import { getNextCurriculumItem } from '@/lib/services/resume-learning';
import { EmptyEnrollmentView } from '@/components/shell/empty-enrollment';
import { ContentHeader } from '@/components/content-player/content-header';
import { EmbeddedVideoPlayer } from '@/components/content-player/embedded-video-player';
import { ResourceViewer } from '@/components/content-player/resource-viewer';
import { CompletionButton } from '@/components/content-player/completion-button';
import { NextLessonBanner } from '@/components/content-player/next-lesson-banner';
import { UnsupportedContentView } from '@/components/content-player/unsupported-content-view';
import { getProjectAssignmentForStudent } from '@/lib/db/queries/projects';
import { ProjectSubmissionWorkspace } from '@/components/projects/project-submission-workspace';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Content Player — RMS Student Portal',
  description: 'Learning content and lecture resource player.'
};

interface ContentPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    batchId?: string;
  }>;
}

export default async function ContentPage({ params, searchParams }: ContentPageProps) {
  const context = await requireStudentEntitlement();

  if (!context.hasActiveEntitlement || !context.student) {
    return <EmptyEnrollmentView context={context} />;
  }

  const { id } = await params;
  const { batchId } = await searchParams;

  // Server-authoritative query (validates entitlement, throws notFound() if unauthorized)
  const item = await getContentItem(context.student.id, id, batchId);

  const effectiveBatchId = batchId || item.relatedBatchContext?.batchId;
  const nextItem = effectiveBatchId
    ? await getNextCurriculumItem(context.student.id, item.id, effectiveBatchId)
    : null;

  const isLecture = item.contentType === 'lecture';
  const isResource = item.contentType === 'notes' || item.contentType === 'resource';
  const isProject = item.contentType === 'project';
  const isSpecialized = !isLecture && !isResource && !isProject;

  let projectAssignment = null;
  if (isProject) {
    projectAssignment = await getProjectAssignmentForStudent(
      context.student.id,
      item.id,
      batchId || item.relatedBatchContext?.batchId
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* 1. Header with breadcrumbs and metadata */}
      <ContentHeader
        title={item.title}
        contentType={item.contentType}
        programCode={item.programCode}
        topic={item.metadata.topic as string | undefined}
        durationMinutes={item.videoMetadata?.durationMinutes || item.metadata.durationMinutes}
        relatedBatchContext={item.relatedBatchContext}
        batchId={batchId}
      />

      {/* 2. Main Content Body according to content type */}
      {isLecture && (
        <div className="space-y-6">
          <EmbeddedVideoPlayer
            contentItemId={item.id}
            videoMetadata={item.videoMetadata}
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <CompletionButton
              contentItemId={item.id}
              contentType={item.contentType}
              initialCompleted={item.isCompleted}
              completedAt={item.completedAt}
              batchId={batchId || item.relatedBatchContext?.batchId}
            />
          </div>

          {/* Lecture Description & Overview */}
          {item.description && (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardContent className="p-5 sm:p-6 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  About this Lecture
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isResource && (
        <div className="space-y-6">
          <ResourceViewer
            title={item.title}
            description={item.description}
            resourceMetadata={item.resourceMetadata}
          />

          <div className="pt-2">
            <CompletionButton
              contentItemId={item.id}
              contentType={item.contentType}
              initialCompleted={item.isCompleted}
              completedAt={item.completedAt}
              batchId={batchId || item.relatedBatchContext?.batchId}
            />
          </div>
        </div>
      )}

      {isProject && projectAssignment && (
        <ProjectSubmissionWorkspace assignment={projectAssignment} />
      )}

      {isSpecialized && (
        <UnsupportedContentView
          contentType={item.contentType}
          title={item.title}
          description={item.description}
        />
      )}

      {/* 3. Next Lesson Navigation / Cohort Continuity Banner */}
      {effectiveBatchId && (
        <div className="pt-4 border-t border-slate-800/80">
          <NextLessonBanner
            batchId={effectiveBatchId}
            batchName={item.relatedBatchContext?.batchName}
            nextItem={nextItem}
            isCurrentItemCompleted={item.isCompleted}
          />
        </div>
      )}
    </div>
  );
}
