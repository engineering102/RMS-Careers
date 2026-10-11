import 'server-only';

import { db } from '@rms/db';
import type { AnyDbClient } from '@rms/db/tx';
import {
  awardActivityXp as awardWithClient,
  buildAwardXpStatement,
  type AwardXpInput,
  type AwardXpResult,
  type ExecutingClient
} from '@rms/db/xp-ledger';

export { buildAwardXpStatement };
export type { AwardXpInput, AwardXpResult };

/**
 * Idempotent, race-safe XP award for student activity (lecture, DSA, quizzes). The single SQL statement
 * and its guarantees live in @rms/db/xp-ledger, shared with the admin portal (project approvals).
 */
export function awardActivityXp(input: AwardXpInput, client: AnyDbClient = db): Promise<AwardXpResult> {
  return awardWithClient(input, client as unknown as ExecutingClient);
}
