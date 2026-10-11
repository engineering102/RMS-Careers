// Vitest stand-in for `next/font/google`. Font loaders only work under the Next.js compiler,
// so unit tests that import app/layout.tsx (e.g. for its metadata) get this inert version.
type FontOptions = { variable?: string };

function stubFont(options: FontOptions = {}) {
  return {
    className: 'font-stub',
    variable: options.variable ? `font-stub${options.variable}` : 'font-stub',
    style: { fontFamily: 'stub' }
  };
}

export const Inter = stubFont;
export const JetBrains_Mono = stubFont;
