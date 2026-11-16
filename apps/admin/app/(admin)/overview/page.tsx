import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  Layers,
  Upload,
  UserCog,
  Users
} from 'lucide-react';
import { getAdminOverview } from '@/lib/db/queries';
import { requireAdminSession } from '@/lib/authz';
import { buildAttentionItems } from '@/lib/overview/attention';
import { batchSectionHref } from '@/components/admin/batch-nav';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/admin/empty-state';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Overview | Academy Control Plane'
};

export const dynamic = 'force-dynamic';

const QUICK_ACTIONS = [
  { href: '/enrollments/import', label: 'Import students', hint: 'CSV or Excel into a batch', icon: Upload },
  { href: '/batches', label: 'Batches', hint: 'Create or open a batch', icon: Layers },
  { href: '/content', label: 'Content Library', hint: 'Add lectures, quizzes, projects', icon: FileText },
  { href: '/tutors', label: 'Tutors', hint: 'Invite and assign tutors', icon: UserCog }
] as const;

export default async function OverviewPage() {
  await requireAdminSession();
  const overview = await getAdminOverview();
  const attention = buildAttentionItems(overview);
  const activeBatches = overview.batches.filter((b) => b.status === 'active');
  const awaitingReview = activeBatches.reduce((sum, b) => sum + b.awaitingReviewCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="What needs your attention across programs, batches and students, with a link to where each job is done."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/enrollments/import">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Import students
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/batches" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatCard
            label="Active batches"
            value={activeBatches.length}
            hint={`${overview.counts.activePrograms} active ${overview.counts.activePrograms === 1 ? 'program' : 'programs'}`}
            icon={Layers}
            className="h-full transition-colors hover:border-primary/40"
          />
        </Link>
        <Link href="/enrollments" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <StatCard
            label="Students with portal access"
            value={overview.counts.studentsWithAccess}
            hint="Active or confirmed enrollment"
            icon={Users}
            tone="success"
            className="h-full transition-colors hover:border-primary/40"
          />
        </Link>
        <Link
          href="/enrollments?status=pending"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            label="Pending enrollments"
            value={overview.counts.pendingEnrollments}
            hint="Waiting for confirmation"
            icon={ClipboardList}
            tone={overview.counts.pendingEnrollments > 0 ? 'warning' : 'default'}
            className="h-full transition-colors hover:border-primary/40"
          />
        </Link>
        <StatCard
          label="Projects to review"
          value={awaitingReview}
          hint="Submitted or under review, active batches"
          icon={BookOpen}
          tone={awaitingReview > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              Needs attention
              {attention.length > 0 ? (
                <Badge variant="secondary" className="tabular-nums">
                  {attention.length}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {attention.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                Nothing is waiting on you. Pending enrollments, project reviews and batch setup gaps appear here.
              </div>
            ) : (
              <ul className="divide-y">
                {attention.map((item) => {
                  const Icon = item.tone === 'warning' ? AlertTriangle : Info;
                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                          item.tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                        <Link href={item.href}>
                          {item.action}
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-0">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{action.label}</span>
                  <span className="block text-xs text-muted-foreground">{action.hint}</span>
                </span>
              </Link>
            ))}
            <p className="mt-2 border-t pt-3 text-xs text-muted-foreground">
              Press <kbd className="rounded border bg-muted px-1 font-mono text-[11px]">Ctrl</kbd>{' '}
              <kbd className="rounded border bg-muted px-1 font-mono text-[11px]">K</kbd> anywhere to find a student,
              batch or content item.
            </p>
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="active-batches-heading" className="flex flex-col gap-3">
        <h2 id="active-batches-heading" className="text-lg font-semibold">
          Active batches
        </h2>
        {activeBatches.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No active batches"
            description="Create a batch for a program and college, then add students and build its curriculum."
            action={
              <Button asChild size="sm">
                <Link href="/batches">Go to Batches</Link>
              </Button>
            }
            className="min-h-[220px]"
          />
        ) : (
          <Card className="overflow-x-auto shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">To review</TableHead>
                  <TableHead className="text-right">Curriculum items</TableHead>
                  <TableHead className="text-right">Jump to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link
                        href={`/batches/${batch.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {batch.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {batch.collegeCode} · {batch.programCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{batch.studentCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.pendingCount > 0 ? (
                        <Link
                          href={`/enrollments?batch=${batch.id}&status=pending`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          aria-label={`${batch.pendingCount} pending in ${batch.name}`}
                        >
                          {batch.pendingCount}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {batch.awaitingReviewCount > 0 ? (
                        <Link
                          href={batchSectionHref(batch.id, 'projects')}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                          aria-label={`${batch.awaitingReviewCount} to review in ${batch.name}`}
                        >
                          {batch.awaitingReviewCount}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{batch.curriculumCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <Link
                          href={batchSectionHref(batch.id, 'curriculum')}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Curriculum
                        </Link>
                        <Link
                          href={batchSectionHref(batch.id, 'live-lectures')}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Live
                        </Link>
                        <Link
                          href={batchSectionHref(batch.id, 'analytics')}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Analytics
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}
