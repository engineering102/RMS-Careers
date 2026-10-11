/**
 * Redaction for everything the diagnostics layer records. Headers, cookies and request/response
 * bodies are never captured at all; this covers URLs and free text (console messages, stacks).
 */

const MAX_TEXT = 600;

/** `origin + pathname` only: query strings and fragments can carry tokens (reset/activation links, callbackUrl). */
export function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol === 'data:' || u.protocol === 'blob:') return `${u.protocol}…`;
    return `${u.origin}${u.pathname}`;
  } catch {
    return redactText(raw).slice(0, 200);
  }
}

const PATTERNS: Array<[RegExp, string]> = [
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, '[jwt]'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 [redacted]'],
  [/\b(authorization|cookie|set-cookie|x-api-key)\s*[:=]\s*[^\s;,]+/gi, '$1=[redacted]'],
  [/([?&#](?:token|code|key|secret|password|pwd|session|csrf[\w-]*|callbackUrl)=)[^&\s"']+/gi, '$1[redacted]'],
  [/\b(postgres(?:ql)?:\/\/)[^\s"']+/gi, '$1[redacted]'],
  [/\b[A-Fa-f0-9]{32,}\b/g, '[hex]'],
  [/\b[A-Za-z0-9+/_-]{40,}={0,2}/g, '[long-token]']
];

export function redactText(text: string, max = MAX_TEXT): string {
  let out = text;
  for (const [re, replacement] of PATTERNS) out = out.replace(re, replacement);
  return out.length > max ? `${out.slice(0, max)}…[truncated]` : out;
}
