import 'server-only';

import { db, colleges, type College, type NewCollege } from '@rms/db';
import { eq, ilike, desc } from 'drizzle-orm';
import {
  DuplicateCollegeCodeError,
  isUniqueViolation,
  normalizeCollegeCode
} from '@/lib/utils/college';

/**
 * Retrieves all registered colleges, optionally filtered by name search.
 */
export async function getColleges(search?: string): Promise<College[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];
    if (search) {
      return await db
        .select()
        .from(colleges)
        .where(ilike(colleges.name, `%${search}%`))
        .orderBy(desc(colleges.createdAt));
    }
    return await db.select().from(colleges).orderBy(desc(colleges.createdAt));
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return [];
  }
}

/**
 * Retrieves a single college by its primary UUID key.
 */
export async function getCollegeById(id: string): Promise<College | null> {
  if (!id || typeof id !== 'string') return null;
  try {
    if (!process.env.POSTGRES_URL) return null;
    const results = await db.select().from(colleges).where(eq(colleges.id, id)).limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error fetching college by id ${id}:`, error);
    return null;
  }
}

/**
 * Retrieves a single college by its unique alphanumeric code (e.g. 'MVSR', 'CBIT').
 */
export async function getCollegeByCode(code: string): Promise<College | null> {
  if (!code || typeof code !== 'string') return null;
  const cleanCode = code.trim().toUpperCase();
  try {
    if (!process.env.POSTGRES_URL) return null;
    const results = await db
      .select()
      .from(colleges)
      .where(eq(colleges.code, cleanCode))
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error(`Error fetching college by code ${cleanCode}:`, error);
    return null;
  }
}

/**
 * Registers a new institution/college in the platform.
 * Ensures the code is stored in uppercase and unique.
 */
export async function createCollege(data: {
  name: string;
  code: string;
  city?: string | null;
  state?: string | null;
}): Promise<College> {
  const cleanCode = normalizeCollegeCode(data.code);
  const cleanName = data.name.trim();

  try {
    const [created] = await db
      .insert(colleges)
      .values({
        name: cleanName,
        code: cleanCode,
        city: data.city || null,
        state: data.state || null,
        isActive: true
      })
      .returning();
    return created;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateCollegeCodeError(cleanCode);
    throw error;
  }
}

/**
 * Updates editable college fields. The id is never changed.
 * Returns null if the college does not exist.
 */
export async function updateCollege(
  id: string,
  data: { name: string; code: string; city?: string | null; state?: string | null }
): Promise<College | null> {
  const cleanCode = normalizeCollegeCode(data.code);
  try {
    const [updated] = await db
      .update(colleges)
      .set({
        name: data.name.trim(),
        code: cleanCode,
        city: data.city || null,
        state: data.state || null,
        updatedAt: new Date()
      })
      .where(eq(colleges.id, id))
      .returning();
    return updated || null;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateCollegeCodeError(cleanCode);
    throw error;
  }
}

/**
 * Active colleges only — for selectors that offer a college as a new choice.
 */
export async function getActiveColleges(): Promise<College[]> {
  try {
    if (!process.env.POSTGRES_URL) return [];
    return await db
      .select()
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .orderBy(desc(colleges.createdAt));
  } catch (error) {
    console.error('Error fetching active colleges:', error);
    return [];
  }
}

/**
 * Updates an institution's active status.
 */
export async function updateCollegeStatus(
  id: string,
  isActive: boolean
): Promise<College | null> {
  if (!id) return null;
  try {
    const [updated] = await db
      .update(colleges)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(colleges.id, id))
      .returning();
    return updated || null;
  } catch (error) {
    console.error(`Error updating status for college ${id}:`, error);
    return null;
  }
}
