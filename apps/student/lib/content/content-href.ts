import { buildDsaHref } from '@/lib/dsa/sheet-view';

export interface CurriculumItemLinkTarget {
  contentType: string;
  contentItemId: string;
  batchId: string;
  /** Content item slug; for a DSA item this is the problem/sheet slug used to deep-link the sheet. */
  slug?: string | null;
}

/** Where a batch curriculum item opens in the student portal (shared by deadlines and notifications). */
export function curriculumItemHref(item: CurriculumItemLinkTarget): string {
  const batchParam = `batchId=${encodeURIComponent(item.batchId)}`;
  switch (item.contentType) {
    case 'dsa_sheet':
      return buildDsaHref(item.slug, item.batchId);
    case 'quiz':
      return `/assessments?${batchParam}`;
    case 'external_test':
      return '/assessments#external-tests';
    case 'lecture':
    case 'project':
    default:
      return `/content/${encodeURIComponent(item.contentItemId)}?${batchParam}`;
  }
}

/** Appends query params to an in-app href, keeping any `#fragment` at the end. */
export function withQueryParams(href: string, params: Record<string, string>): string {
  const hashIndex = href.indexOf('#');
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const query = new URLSearchParams(params).toString();
  if (!query) return href;
  return `${base}${base.includes('?') ? '&' : '?'}${query}${hash}`;
}
