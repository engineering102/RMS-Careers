// Subject classification of learning content (content_items.metadata.subject).
//
// Pure data and helpers with no database access, so admin authoring (client and server) and the student
// library can both import it. Admins pick a subject in the content builder; content saved before the field
// existed, or left on "Auto", is classified from its topic and title by the keyword rules below.

export interface ContentSubject {
  slug: string;
  label: string;
  /**
   * Lowercase phrases that mark untagged content as this subject. Each matches at the start of a word, so
   * "array" also matches "arrays" but "git" does not match "digit".
   */
  keywords: string[];
}

/** Subject for content that no rule recognises. Not selectable by admins. */
export const FALLBACK_SUBJECT_SLUG = 'general';
export const FALLBACK_SUBJECT_LABEL = 'General';

/** Selectable subjects, in the order students see them. */
export const CONTENT_SUBJECTS: ContentSubject[] = [
  {
    slug: 'programming-fundamentals',
    label: 'Programming Fundamentals',
    keywords: [
      'programming',
      'python',
      'java',
      'c++',
      'oop',
      'object oriented',
      'object-oriented',
      'variable',
      'loop',
      'function',
      'syntax',
      'data type'
    ]
  },
  {
    slug: 'dsa',
    label: 'Data Structures & Algorithms',
    keywords: [
      'dsa',
      'data structure',
      'algorithm',
      'array',
      'string',
      'linked list',
      'binary tree',
      'binary search',
      'tree',
      'graph',
      'heap',
      'hashing',
      'hash map',
      'two pointer',
      'sliding window',
      'recursion',
      'backtracking',
      'dynamic programming',
      'greedy',
      'sorting',
      'complexity',
      'big o',
      'leetcode'
    ]
  },
  {
    slug: 'system-design',
    label: 'System Design',
    keywords: [
      'system design',
      'scalab',
      'distributed',
      'microservice',
      'load balanc',
      'caching',
      'architecture',
      'low level design',
      'high level design',
      'design pattern'
    ]
  },
  {
    slug: 'core-cs',
    label: 'Core CS',
    keywords: [
      'operating system',
      'dbms',
      'database',
      'sql',
      'mysql',
      'postgres',
      'computer network',
      'networking',
      'tcp',
      'core cs'
    ]
  },
  {
    slug: 'web-development',
    label: 'Web Development',
    keywords: [
      'web',
      'html',
      'css',
      'javascript',
      'typescript',
      'react',
      'next.js',
      'node',
      'frontend',
      'front-end',
      'backend',
      'back-end',
      'full stack',
      'full-stack',
      'rest api',
      'graphql'
    ]
  },
  {
    slug: 'dev-tools',
    label: 'Developer Tools',
    keywords: ['git', 'github', 'linux', 'terminal', 'command line', 'docker', 'devops', 'ci/cd', 'deployment']
  },
  {
    slug: 'aptitude',
    label: 'Aptitude & Reasoning',
    keywords: ['aptitude', 'quantitative', 'logical reasoning', 'reasoning', 'verbal']
  },
  {
    slug: 'career',
    label: 'Interview & Career Prep',
    keywords: ['resume', 'interview', 'hr round', 'communication', 'soft skill', 'career', 'placement', 'linkedin']
  }
];

/**
 * Order the keyword rules are tried in; the first match wins. More specific subjects go first so that
 * "System Design & Backend" is System Design and "JavaScript" is Web Development rather than Java.
 */
const MATCH_ORDER = [
  'system-design',
  'web-development',
  'core-cs',
  'dev-tools',
  'aptitude',
  'dsa',
  'career',
  'programming-fundamentals'
];

export const CONTENT_SUBJECT_SLUGS: string[] = CONTENT_SUBJECTS.map((s) => s.slug);

export function isContentSubject(value: unknown): value is string {
  return typeof value === 'string' && CONTENT_SUBJECT_SLUGS.includes(value);
}

export function contentSubjectLabel(slug: string): string {
  return CONTENT_SUBJECTS.find((s) => s.slug === slug)?.label ?? FALLBACK_SUBJECT_LABEL;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Keyword rules as regular expressions over lowercased text, in match order. The syntax is the subset that
 * JavaScript and PostgreSQL (`~`) read the same way, so the library can classify in SQL with these exact rules.
 */
export const CONTENT_SUBJECT_RULES: { slug: string; pattern: string }[] = MATCH_ORDER.map((slug) => {
  const subject = CONTENT_SUBJECTS.find((s) => s.slug === slug)!;
  return { slug, pattern: `(^|[^a-z0-9])(${subject.keywords.map(escapeRegex).join('|')})` };
});

export interface SubjectSource {
  /** metadata.subject as stored. */
  subject?: unknown;
  topic?: unknown;
  category?: unknown;
  title?: unknown;
}

/** The text the keyword rules read: topic, category and title, lowercased. Mirrored in SQL by the library query. */
export function subjectMatchText(source: SubjectSource): string {
  return [source.topic, source.category, source.title]
    .filter((part): part is string => typeof part === 'string' && part !== '')
    .join(' ')
    .toLowerCase();
}

/** An admin's explicit subject wins; otherwise the first keyword rule that matches; otherwise General. */
export function resolveContentSubject(source: SubjectSource): string {
  if (isContentSubject(source.subject)) return source.subject;
  const text = subjectMatchText(source);
  if (text) {
    for (const rule of CONTENT_SUBJECT_RULES) {
      if (new RegExp(rule.pattern).test(text)) return rule.slug;
    }
  }
  return FALLBACK_SUBJECT_SLUG;
}
