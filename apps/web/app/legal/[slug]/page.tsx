import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';
import { Mail, Globe, MapPin, Scale } from 'lucide-react';
import {
  LEGAL_BUSINESS_ADDRESS,
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_NAME,
  LEGAL_LAST_UPDATED,
  getLegalPolicy,
  legalPolicies,
  type LegalBlock
} from '@/lib/data/legal-content';

export const dynamicParams = false;

export function generateStaticParams() {
  return legalPolicies.map((policy) => ({ slug: policy.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = getLegalPolicy(slug);
  if (!policy) return {};
  return {
    title: policy.title,
    description: policy.description,
    alternates: { canonical: `/legal/${policy.slug}` },
    openGraph: {
      title: `${policy.title} | RMS Careers`,
      description: policy.description
    }
  };
}

const LINK_PATTERN = /(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+\.[\w.-]+\w|https:\/\/[^\s,)]+[^\s,).])/g;

function renderInline(text: string): ReactNode {
  return text.split(LINK_PATTERN).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith('https://')) {
      return (
        <a key={i} href={part} className="text-primary underline-offset-4 hover:underline break-words">
          {part}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+\w$/.test(part)) {
      return (
        <a key={i} href={`mailto:${part}`} className="text-primary underline-offset-4 hover:underline">
          {part}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function renderBlock(block: LegalBlock, key: number) {
  switch (block.type) {
    case 'h3':
      return (
        <h3 key={key} className="pt-2 text-base font-semibold text-foreground">
          {block.text}
        </h3>
      );
    case 'ul':
      return (
        <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground/60">
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    default:
      return <p key={key}>{renderInline(block.text)}</p>;
  }
}

export default async function LegalPolicyPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = getLegalPolicy(slug);
  if (!policy) notFound();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Policy navigation */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Legal</h2>
          <nav aria-label="Legal policies">
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {legalPolicies.map((item) => {
                const active = item.slug === policy.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/legal/${item.slug}`}
                      aria-current={active ? 'page' : undefined}
                      className={
                        active
                          ? 'block rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary'
                          : 'block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                      }
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <header className="mb-10 space-y-4 border-b border-border pb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Scale className="h-4 w-4" />
              <span>Legal</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {policy.title}
            </h1>
            <p className="text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>
          </header>

          <div className="space-y-10">
            {policy.sections.map((section, index) => (
              <section key={section.heading} aria-labelledby={`section-${index + 1}`} className="space-y-3">
                <h2 id={`section-${index + 1}`} className="text-xl font-bold text-foreground">
                  <span className="mr-2 text-muted-foreground/70">{index + 1}.</span>
                  {section.heading}
                </h2>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {section.blocks.map(renderBlock)}
                </div>
              </section>
            ))}
          </div>

          {/* Contact card (follows each policy's closing contact section) */}
          <div className="mt-6 space-y-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{LEGAL_ENTITY_NAME}</p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              {renderInline(LEGAL_CONTACT_EMAIL)}
            </p>
            <p className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0" />
              {renderInline('https://www.rms-careers.com/')}
            </p>
            {LEGAL_BUSINESS_ADDRESS && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{LEGAL_BUSINESS_ADDRESS}</span>
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
