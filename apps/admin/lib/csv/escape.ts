/**
 * CSV cell encoding for every admin export (audit F-12).
 *
 * Values are quoted (embedded quotes doubled) as the chosen mode requires. Text a spreadsheet would treat as a formula
 * (leading =, +, -, @, tab or carriage return; OWASP "CSV injection") is prefixed with a single quote
 * so it is displayed as text. This matters because several exported fields (names, roll numbers,
 * branches) can be typed by anonymous users on the public enrollment form.
 * Numbers are emitted as-is, so negative scores stay numeric.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * `always` quotes every cell; `minimal` quotes only when required (comma, quote, newline), preserving
 * the established format of exports that used minimal quoting. Formula neutralisation applies to both.
 */
export function csvCell(value: unknown, quoting: 'always' | 'minimal' = 'always'): string {
  if (value === null || value === undefined) return quoting === 'always' ? '""' : '';
  const isNumber = typeof value === 'number' || typeof value === 'bigint';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (!isNumber && FORMULA_PREFIX.test(text)) text = `'${text}`;
  const needsQuotes = quoting === 'always' || /[",\r\n]/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map((value) => csvCell(value)).join(',');
}
