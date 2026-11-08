/**
 * Page numbers to render for a numbered pager: always the first and last page, the current page with one neighbour
 * on each side, and `'gap'` where pages are skipped. A gap that would hide a single page shows that page instead.
 * e.g. (6, 12) → [1, 'gap', 5, 6, 7, 'gap', 12]; (2, 5) → [1, 2, 3, 4, 5].
 */
export function paginationRange(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 1) return [1];
  const current = Math.min(Math.max(1, page), totalPages);

  const wanted = new Set([1, totalPages, current - 1, current, current + 1]);
  const pages = Array.from(wanted)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const out: (number | 'gap')[] = [];
  for (const p of pages) {
    const prev = out[out.length - 1];
    if (typeof prev === 'number' && p - prev === 2) out.push(prev + 1);
    else if (typeof prev === 'number' && p - prev > 2) out.push('gap');
    out.push(p);
  }
  return out;
}
