/**
 * ANONYMOUS DSA PROGRESS MANAGER
 *
 * CRITICAL ARCHITECTURAL INVARIANTS:
 * 1. Anonymous progress is stored STRICTLY in browser `localStorage`.
 * 2. ZERO database writes.
 * 3. ZERO XP awarded.
 * 4. ZERO streaks updated.
 * 5. ZERO leaderboard mutations.
 * 6. ZERO user accounts created.
 * 7. NEVER automatically merged into authenticated student progress upon login.
 */

const STORAGE_KEY = 'rms_anonymous_dsa_progress_v1';

export interface AnonymousProgressRecord {
  sheetSlug: string;
  problemId: string;
  solved: boolean;
  solvedAt: string; // ISO string
}

export interface AnonymousProgressState {
  version: 1;
  solvedProblems: Record<string, AnonymousProgressRecord>; // key: `${sheetSlug}:${problemId}`
  updatedAt: string;
}

function getInitialState(): AnonymousProgressState {
  return {
    version: 1,
    solvedProblems: {},
    updatedAt: new Date().toISOString()
  };
}

/**
 * Safely reads anonymous progress from localStorage.
 * Handles SSR and private-browsing storage restrictions gracefully.
 */
export function getAnonymousProgress(): AnonymousProgressState {
  if (typeof window === 'undefined') {
    return getInitialState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.solvedProblems === 'object') {
      return parsed as AnonymousProgressState;
    }
    return getInitialState();
  } catch (err) {
    console.warn('[AnonymousProgress] Failed to read localStorage:', err);
    return getInitialState();
  }
}

/**
 * Updates a problem's solved state in local browser storage.
 */
export function toggleAnonymousProblemSolved(
  sheetSlug: string,
  problemId: string,
  solved: boolean
): AnonymousProgressState {
  if (typeof window === 'undefined') {
    return getInitialState();
  }

  try {
    const current = getAnonymousProgress();
    const key = `${sheetSlug}:${problemId}`;

    if (solved) {
      current.solvedProblems[key] = {
        sheetSlug,
        problemId,
        solved: true,
        solvedAt: new Date().toISOString()
      };
    } else {
      delete current.solvedProblems[key];
    }

    current.updatedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    // Dispatch custom event so other components in the same tab update immediately
    window.dispatchEvent(new Event('rms:anonymous-progress-updated'));

    return current;
  } catch (err) {
    console.warn('[AnonymousProgress] Failed to save localStorage:', err);
    return getInitialState();
  }
}

/**
 * Checks if a specific problem is solved locally.
 */
export function isAnonymousProblemSolved(sheetSlug: string, problemId: string): boolean {
  const state = getAnonymousProgress();
  const key = `${sheetSlug}:${problemId}`;
  return !!state.solvedProblems[key]?.solved;
}

/**
 * Gets the total number of problems solved locally.
 */
export function getAnonymousSolvedCount(sheetSlug?: string): number {
  const state = getAnonymousProgress();
  const entries = Object.values(state.solvedProblems);
  if (!sheetSlug) {
    return entries.filter((e) => e.solved).length;
  }
  return entries.filter((e) => e.sheetSlug === sheetSlug && e.solved).length;
}

/**
 * Clears all anonymous local progress.
 */
export function clearAnonymousProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('rms:anonymous-progress-updated'));
  } catch (err) {
    console.warn('[AnonymousProgress] Failed to clear localStorage:', err);
  }
}
