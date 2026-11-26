// Reads and validates the curriculum template pack in ops/curriculum-template (no database access).
// Shared by scripts/import-curriculum-template.ts and its unit test, so whatever passes the test imports.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isContentSubject } from '@rms/db/content-subjects';
import { parseQuizImport, type ImportedQuestion } from '../../lib/content/quiz-import';
import { projectRubricSchema, type RubricCriterionInput } from '../../lib/content/project-rubric';

/** Marks rows the importer owns; it never overwrites a row without this tag. */
export const PACK_ID = 'placement-26w';

export interface TemplateSettings {
  college: { code: string; name: string; city: string | null; state: string | null };
  programCode: string;
  batchName: string;
  /** ISO timestamp of Week 1, Day 1. */
  startsAt: string;
  weeks: number;
}

interface BaseItem {
  slug: string;
  title: string;
  description: string;
  topic: string;
  subject: string;
  week: number;
  order: number;
  required: boolean;
  /** Days after the week starts that the item is due; null for none. */
  dueAfterDays: number | null;
}

export type PackItem =
  | (BaseItem & { kind: 'notes' | 'resource'; body: string; minutes: number | null })
  | (BaseItem & {
      kind: 'quiz';
      quizType: 'practice' | 'formal';
      timeLimitMinutes: number | null;
      passPercent: number;
      explanations: 'immediate' | 'after_deadline' | 'never';
      questions: ImportedQuestion[];
    })
  | (BaseItem & { kind: 'project'; rubric: RubricCriterionInput[] })
  | (BaseItem & { kind: 'dsa_sheet'; sheetSlug: string });

/** An item that already exists in the target database (published, global) and is only placed. */
export interface ReusedItem {
  slug: string;
  week: number;
  order: number;
  required: boolean;
  dueAfterDays: number | null;
}

export interface TemplatePack {
  root: string;
  settings: TemplateSettings;
  items: PackItem[];
  reused: ReusedItem[];
  problems: string[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DESCRIPTION_MAX = 600;
const NOTES_MAX = 60_000;
const PROJECT_BRIEF_MAX = 2000;

/** Minimal front matter: `key: value` lines between `---` fences. */
export function splitFrontMatter(text: string): { meta: Record<string, string>; body: string } {
  const normalized = text.replace(/\r\n?/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: normalized };
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9]*)\s*:\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return { meta, body: match[2].replace(/^\n+/, '').replace(/\s+$/, '') + '\n' };
}

interface ManifestEntry {
  file?: string;
  reuse?: string;
  required?: boolean;
  dueAfterDays?: number;
}

export function loadTemplatePack(root: string): TemplatePack {
  const problems: string[] = [];
  const settings = JSON.parse(readFileSync(path.join(root, 'template.json'), 'utf8')) as TemplateSettings;
  const items: PackItem[] = [];
  const reused: ReusedItem[] = [];

  const weeksDir = path.join(root, 'weeks');
  const weekDirs = existsSync(weeksDir) ? readdirSync(weeksDir).filter((d) => /^week-\d{2}$/.test(d)).sort() : [];

  for (const dir of weekDirs) {
    const week = Number(dir.slice(5));
    const where = (f: string) => `weeks/${dir}/${f}`;
    if (week < 1 || week > settings.weeks) problems.push(`${dir}: week out of range`);
    const manifestPath = path.join(weeksDir, dir, 'week.json');
    if (!existsSync(manifestPath)) {
      problems.push(`${dir}: week.json missing`);
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { items: ManifestEntry[] };

    manifest.items.forEach((entry, index) => {
      const order = index + 1;
      const required = entry.required ?? true;
      const dueAfterDays = entry.dueAfterDays ?? null;
      if (entry.reuse) {
        reused.push({ slug: entry.reuse, week, order, required, dueAfterDays });
        return;
      }
      if (!entry.file) {
        problems.push(`${where('week.json')} item ${order}: needs "file" or "reuse"`);
        return;
      }
      const file = path.join(weeksDir, dir, entry.file);
      if (!existsSync(file)) {
        problems.push(`${where(entry.file)}: file missing`);
        return;
      }
      const raw = readFileSync(file, 'utf8');
      const base = (meta: Record<string, string>) => ({
        slug: meta.slug ?? '',
        title: meta.title ?? '',
        description: meta.description ?? '',
        topic: meta.topic ?? '',
        subject: meta.subject ?? '',
        week,
        order,
        required,
        dueAfterDays
      });

      if (entry.file.endsWith('.project.json') || entry.file.endsWith('.dsa.json')) {
        const json = JSON.parse(raw) as Record<string, unknown>;
        const meta = Object.fromEntries(Object.entries(json).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
        if (entry.file.endsWith('.dsa.json')) {
          items.push({ ...base(meta), kind: 'dsa_sheet', sheetSlug: meta.sheetSlug ?? '' });
        } else {
          const rubric = projectRubricSchema.safeParse(json.rubric);
          if (!rubric.success) problems.push(`${where(entry.file)}: rubric ${rubric.error.errors[0]?.message}`);
          items.push({ ...base(meta), kind: 'project', rubric: rubric.success ? rubric.data : [] });
        }
        return;
      }

      const { meta, body } = splitFrontMatter(raw);
      if (meta.type === 'quiz') {
        const parsed = parseQuizImport(body);
        for (const issue of parsed.issues) problems.push(`${where(entry.file)} question ${issue.block}: ${issue.message}`);
        if (parsed.questions.length < 5) problems.push(`${where(entry.file)}: only ${parsed.questions.length} questions`);
        items.push({
          ...base(meta),
          kind: 'quiz',
          quizType: meta.quizType === 'formal' ? 'formal' : 'practice',
          timeLimitMinutes: meta.timeLimit ? Number(meta.timeLimit) : null,
          passPercent: meta.passPercent ? Number(meta.passPercent) : 60,
          explanations: (meta.explanations as 'immediate' | 'after_deadline' | 'never') || 'immediate',
          questions: parsed.questions
        });
      } else if (meta.type === 'notes' || meta.type === 'resource') {
        items.push({ ...base(meta), kind: meta.type, body, minutes: meta.minutes ? Number(meta.minutes) : null });
      } else {
        problems.push(`${where(entry.file)}: front matter "type" must be notes, resource or quiz`);
      }
    });
  }

  // Item-level checks
  const seen = new Map<string, string>();
  for (const item of items) {
    const label = `week ${item.week} "${item.title || item.slug}"`;
    if (!SLUG.test(item.slug)) problems.push(`${label}: invalid slug "${item.slug}"`);
    if (seen.has(item.slug)) problems.push(`${label}: slug "${item.slug}" also used by ${seen.get(item.slug)}`);
    seen.set(item.slug, label);
    if (item.title.length < 3) problems.push(`${label}: title missing`);
    if (!item.description) problems.push(`${label}: description missing`);
    if (item.description.length > DESCRIPTION_MAX && item.kind !== 'project') problems.push(`${label}: description over ${DESCRIPTION_MAX} chars`);
    if (item.kind === 'project' && item.description.length > PROJECT_BRIEF_MAX) problems.push(`${label}: brief over ${PROJECT_BRIEF_MAX} chars`);
    if (!item.topic) problems.push(`${label}: topic missing`);
    if (!isContentSubject(item.subject)) problems.push(`${label}: unknown subject "${item.subject}"`);
    if ((item.kind === 'notes' || item.kind === 'resource') && (item.body.trim().length < 200 || item.body.length > NOTES_MAX)) {
      problems.push(`${label}: notes body must be 200–${NOTES_MAX} chars`);
    }
    if (item.kind === 'quiz' && item.quizType === 'formal' && !item.timeLimitMinutes) problems.push(`${label}: formal quiz needs timeLimit`);
    if (item.kind === 'dsa_sheet' && !SLUG.test(item.sheetSlug)) problems.push(`${label}: sheetSlug missing`);
  }
  for (const r of reused) {
    if (seen.has(r.slug)) problems.push(`week ${r.week}: reused slug "${r.slug}" clashes with a pack item`);
  }

  return { root, settings, items, reused, problems };
}

export const templatePackRoot = (repoRoot: string) => path.join(repoRoot, 'ops', 'curriculum-template');
