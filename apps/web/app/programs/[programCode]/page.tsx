import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Calendar,
  Users,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  Code2,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { getPublicProgramByCode } from '@/lib/db/queries/programs';

export const dynamic = 'force-dynamic';

interface ProgramDetailProps {
  params: Promise<{ programCode: string }>;
}

export async function generateMetadata({ params }: ProgramDetailProps): Promise<Metadata> {
  const { programCode } = await params;
  const program = await getPublicProgramByCode(programCode);

  if (!program) {
    return {
      title: 'Program Not Found | RMS Careers',
      description: 'The requested public program could not be located on the platform.'
    };
  }

  return {
    title: `${program.name} (${program.code})`,
    description:
      program.description || `Comprehensive technical curriculum for ${program.name}.`,
    openGraph: {
      title: `${program.name} | RMS Careers`,
      description:
        program.description || `Comprehensive technical curriculum for ${program.name}.`
    }
  };
}

export default async function ProgramDetailPage({ params }: ProgramDetailProps) {
  const { programCode } = await params;
  const program = await getPublicProgramByCode(programCode);

  if (!program) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-3xl text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Program Not Available</h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
          The program with code <span className="font-mono font-semibold text-foreground">{programCode}</span> is either private to an institutional partner, archived, or does not exist.
        </p>
        <div className="pt-2">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Public Programs</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedStartDate = program.startDate
    ? new Date(program.startDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const formattedEndDate = program.endDate
    ? new Date(program.endDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Back button */}
      <div className="mb-8">
        <Link
          href="/programs"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Programs</span>
        </Link>
      </div>

      {/* Program Header */}
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1 text-sm font-mono font-bold text-primary">
            {program.code}
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Open Platform Program
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {program.name}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
          {program.description || 'Intensive engineering program focused on production architecture, algorithmic foundations, and industry interview preparation.'}
        </p>

        {/* Metadata badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Timeline</div>
              <div className="text-sm font-semibold text-foreground">
                {formattedStartDate ? formattedStartDate : 'Rolling Enrollment'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Cohort Size</div>
              <div className="text-sm font-semibold text-foreground">
                {program.capacity > 0 ? `${program.capacity} Seats` : 'Open Cohort'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Access</div>
              <div className="text-sm font-semibold text-foreground">Platform Enrolled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Program Content Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Curriculum Highlights</span>
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Core algorithmic patterns: Sliding Window, Dynamic Programming, Graph Traversals</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Full-stack architecture: Next.js App Router, relational database schemas, Drizzle ORM</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>Live problem reviews, code audits, and complexity trade-off analyses</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            <span>Target Audience</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Designed for engineering students, pre-final and final year candidates, and developers seeking structured mastery in technical problem-solving and modern system development.
          </p>
          <div className="pt-2">
            <Link
              href="/learn/dsa"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <span>Test yourself on Free Starter DSA Sheets</span>
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
