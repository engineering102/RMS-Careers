import 'server-only';

import { db, contentItems, programs, batchCurriculum } from '@rms/db';
import { eq, ne, and, or, inArray, isNull, sql, desc, asc } from 'drizzle-orm';
import { resolveContentSubject } from '@rms/db/content-subjects';
import type { LibraryCatalogItem, LibraryContentType, LibraryDifficulty } from '@/lib/types/library';

export type { LibraryCatalogItem };

/** Display fallbacks for program-independent (central) content. */
export const DEFAULT_PROGRAM_NAME = 'RMS Careers';
export const DEFAULT_PROGRAM_CODE = 'RMS';

/** Most recent items sent to the browser. A student's catalog is far smaller; this only bounds the payload. */
export const LIBRARY_CATALOG_LIMIT = 1000;

/** Characters of a description a card can show (two lines), plus room for search to match on. */
const DESCRIPTION_EXCERPT_LENGTH = 240;

const DIFFICULTIES: LibraryDifficulty[] = ['beginner', 'intermediate', 'advanced'];

/**
 * An admin has switched "Show in the student Library" on for the item (content_items.metadata.inLibrary).
 * Opt-in: content without the flag is reached only through a batch curriculum. Exported for the content
 * player, which must open what the Library lists.
 */
export const isInLibrary = () => sql`(${contentItems.metadata}->>'inLibrary') = 'true'`;

/**
 * Who a Library item is for: global content (no program) is for every enrolled student; program content is for
 * students enrolled in that program. The batch a student is in plays no part: the Library is shared.
 */
function libraryAudience(programIds: number[]) {
  const global = isNull(contentItems.programId);
  return programIds.length > 0 ? or(global, inArray(contentItems.programId, programIds))! : global;
}

/**
 * True unless the item is scheduled in one of the student's batches and not yet released in any of them.
 * The content player refuses those, so the Library must not list a card that would open onto "not found".
 */
function notLockedByRelease(batchIds: string[]) {
  if (batchIds.length === 0) return sql`true`;
  const placed = sql`SELECT 1 FROM ${batchCurriculum} WHERE ${batchCurriculum.contentItemId} = ${contentItems.id} AND ${batchCurriculum.batchId} IN ${batchIds}`;
  return sql`(NOT EXISTS (${placed}) OR EXISTS (${placed} AND (${batchCurriculum.availableFrom} IS NULL OR ${batchCurriculum.availableFrom} <= now())))`;
}

const metaText = (key: string) => sql<string | null>`nullif(${contentItems.metadata}->>${sql.raw(`'${key}'`)}, '')`;

/**
 * Every Library item the student may open, newest first, in ONE query. The Library page loads this once and
 * browses it in the browser (formats, subjects, search), so moving around the Library costs no further requests.
 *
 * What is listed: published content an admin has put in the Library, never external tests (they live on
 * Assessments), that is global or belongs to an enrolled program, and is not still locked by a batch release date.
 * Being scheduled in a batch does not put content in the Library: the week-by-week curriculum is the batch's own,
 * the Library is common to everyone enrolled. Only card-sized fields are selected: notes bodies and other metadata
 * stay in the database.
 */
export async function getLibraryCatalog(options: {
  enrolledProgramIds: number[];
  enrolledBatchIds: string[];
}): Promise<LibraryCatalogItem[]> {
  const { enrolledProgramIds, enrolledBatchIds } = options;

  if (!process.env.POSTGRES_URL) return [];
  if (enrolledProgramIds.length === 0 && enrolledBatchIds.length === 0) return [];

  try {
    const rows = await db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        slug: contentItems.slug,
        contentType: contentItems.contentType,
        description: sql<string | null>`left(${contentItems.description}, ${sql.raw(String(DESCRIPTION_EXCERPT_LENGTH))})`,
        topic: metaText('topic'),
        category: metaText('category'),
        subject: metaText('subject'),
        durationMinutes: metaText('durationMinutes'),
        difficulty: metaText('difficulty'),
        programCode: programs.code
      })
      .from(contentItems)
      // leftJoin: content_items.program_id is nullable (central content is placed via batch_curriculum)
      .leftJoin(programs, eq(programs.id, contentItems.programId))
      .where(
        and(
          eq(contentItems.isPublished, true),
          ne(contentItems.contentType, 'external_test'),
          isInLibrary(),
          libraryAudience(enrolledProgramIds),
          notLockedByRelease(enrolledBatchIds)
        )
      )
      .orderBy(desc(contentItems.createdAt), asc(contentItems.title))
      .limit(LIBRARY_CATALOG_LIMIT);

    return rows.map((r) => {
      const duration = r.durationMinutes === null ? NaN : Number(r.durationMinutes);
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        contentType: r.contentType as LibraryContentType,
        description: r.description?.trim() || null,
        topic: r.topic ?? r.category,
        subject: resolveContentSubject({ subject: r.subject, topic: r.topic, category: r.category, title: r.title }),
        durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
        difficulty: DIFFICULTIES.find((d) => d === r.difficulty) ?? null,
        programCode: r.programCode ?? DEFAULT_PROGRAM_CODE
      };
    });
  } catch (error) {
    console.error('[Library] Error retrieving the library catalog:', error);
    return [];
  }
}
