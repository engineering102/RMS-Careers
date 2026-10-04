import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Code2, ShieldCheck, Clock, Layers } from 'lucide-react';
import { getPublicSheetBySlug } from '@/lib/data/dsa-sheets';
import { SheetProgressBadge } from '@/components/sheet-progress';
import { ProblemView } from '@/components/problem-view';

interface SheetPageProps {
  params: Promise<{ sheet: string }>;
}

export async function generateMetadata({ params }: SheetPageProps): Promise<Metadata> {
  const { sheet: sheetSlug } = await params;
  const sheet = getPublicSheetBySlug(sheetSlug);

  if (!sheet) {
    return {
      title: 'Sheet Not Found | RMS Careers',
      description: 'The requested starter DSA practice sheet does not exist.'
    };
  }

  return {
    title: `${sheet.title} — Starter DSA Practice`,
    description: sheet.shortDescription,
    openGraph: {
      title: `${sheet.title} | RMS Careers`,
      description: sheet.shortDescription
    }
  };
}

export default async function SheetDetailPage({ params }: SheetPageProps) {
  const { sheet: sheetSlug } = await params;
  const sheet = getPublicSheetBySlug(sheetSlug);

  if (!sheet) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/learn/dsa"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Starter Sheets</span>
        </Link>
      </div>

      {/* Sheet Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Public Starter Sheet
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              ~{sheet.estimatedHours} hours
            </span>
          </div>

          <SheetProgressBadge
            sheetSlug={sheet.slug}
            totalQuestions={sheet.questions.length}
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          {sheet.title}
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
          {sheet.description}
        </p>

        {/* Quick jump problem anchors */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground mr-1">Quick Jump:</span>
          {sheet.questions.map((q, idx) => (
            <a
              key={q.id}
              href={`#${q.slug}`}
              className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors font-medium"
            >
              {idx + 1}. {q.title}
            </a>
          ))}
        </div>
      </div>

      {/* Problem list */}
      <div className="space-y-8">
        {sheet.questions.map((question) => (
          <ProblemView
            key={question.id}
            question={question}
            sheetSlug={sheet.slug}
          />
        ))}
      </div>
    </div>
  );
}
