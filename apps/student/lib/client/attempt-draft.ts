// Device-local draft of an in-progress formal assessment attempt.
//
// The server only stores responses at submission time, so before this a refresh, crash or closed tab
// mid-exam silently discarded every selected answer while the authoritative timer kept running. The draft
// is keyed by attempt id, restored on reload, sanitised against the attempt's own questions/options, and
// removed once the attempt is submitted. Grading is unchanged: the server still grades only what is
// submitted, and drops anything that does not belong to the quiz.

export type ResponseMap = Record<number, string[]>;

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface DraftQuestion {
  id: number;
  options: { id: string }[];
}

const KEY_PREFIX = 'rms_formal_attempt_draft_v1:';

export function attemptDraftKey(attemptId: string): string {
  return `${KEY_PREFIX}${attemptId}`;
}

/** localStorage when available; null in private modes, SSR, or when storage access throws. */
export function getDraftStorage(): DraftStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Saved responses for this attempt, keeping only known questions and their real option ids. */
export function loadAttemptDraft(
  storage: DraftStorage | null,
  attemptId: string,
  questions: DraftQuestion[]
): ResponseMap {
  if (!storage) return {};
  let parsed: unknown;
  try {
    const raw = storage.getItem(attemptDraftKey(attemptId));
    if (!raw) return {};
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const result: ResponseMap = {};
  for (const question of questions) {
    const saved = (parsed as Record<string, unknown>)[String(question.id)];
    if (!Array.isArray(saved)) continue;
    const validIds = new Set(question.options.map((o) => o.id));
    const kept = saved.filter((id): id is string => typeof id === 'string' && validIds.has(id));
    if (kept.length > 0) result[question.id] = Array.from(new Set(kept));
  }
  return result;
}

export function saveAttemptDraft(storage: DraftStorage | null, attemptId: string, responses: ResponseMap): void {
  if (!storage) return;
  try {
    storage.setItem(attemptDraftKey(attemptId), JSON.stringify(responses));
  } catch {
    // Quota exceeded or storage disabled: the attempt still works, it just is not restorable.
  }
}

export function clearAttemptDraft(storage: DraftStorage | null, attemptId: string): void {
  if (!storage) return;
  try {
    storage.removeItem(attemptDraftKey(attemptId));
  } catch {
    // ignore
  }
}

/** Server responses win for any question they answer; the draft fills in the rest. */
export function mergeResponses(serverResponses: ResponseMap, draft: ResponseMap): ResponseMap {
  const merged: ResponseMap = { ...draft };
  for (const [qId, ids] of Object.entries(serverResponses)) {
    if (Array.isArray(ids) && ids.length > 0) merged[Number(qId)] = ids;
  }
  return merged;
}
