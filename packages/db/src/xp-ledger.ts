import { sql } from 'drizzle-orm';
import type { ActivityTypeEnum } from './schema';

/**
 * Shared XP ledger (`@rms/db/xp-ledger`), used by the student portal (lecture, DSA, quiz XP) and the
 * admin portal (project approval XP) so every award follows one rule (audit F-07):
 *
 * One statement, so one implicit transaction on both the neon-http and the WebSocket client:
 *  1. `ins`: idempotent ledger insert guarded by activity_idempotency_idx
 *     (student_id, activity_type, reference_id). Returns a row only when the award is new.
 *  2. `stats`: student_stats upsert driven by `ins`, so XP, level, streak and dsa_solved_count move only
 *     when the ledger row was inserted. Arithmetic is relative to the current row, so concurrent awards
 *     for one student serialise on the row lock instead of overwriting each other. A student without a
 *     college has no stats row (college_id is NOT NULL); the ledger row is still written.
 * Streak days are Asia/Kolkata calendar days.
 */

export interface AwardXpInput {
  studentId: number;
  batchId: string | null;
  activityType: ActivityTypeEnum;
  referenceId: string;
  xp: number;
  now?: Date;
}

export interface AwardXpResult {
  /** True only for the request whose ledger row was actually inserted. */
  awarded: boolean;
  xpAwarded: number;
}

/** Anything that can run a raw statement: the neon-http client, the WebSocket client or a transaction. */
export interface ExecutingClient {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
}

/** YYYY-MM-DD in Asia/Kolkata. */
export function istDate(reference: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(reference);
}

/** The IST calendar day before `todayIst` (YYYY-MM-DD). */
export function previousIstDate(todayIst: string): string {
  const [year, month, day] = todayIst.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function buildAwardXpStatement(input: AwardXpInput, todayIst: string, yesterdayIst: string) {
  const dsaIncrement = input.activityType === 'dsa_solved' ? 1 : 0;
  const streakExpr = sql`CASE
      WHEN student_stats.last_activity_date_ist = ${todayIst} THEN student_stats.current_streak
      WHEN student_stats.last_activity_date_ist = ${yesterdayIst} THEN student_stats.current_streak + 1
      ELSE 1 END`;

  return sql`
    WITH ins AS (
      INSERT INTO activities (student_id, batch_id, activity_type, reference_id, xp_awarded, activity_date_ist, created_at)
      VALUES (${input.studentId}, ${input.batchId}, ${input.activityType}::activity_type, ${input.referenceId}, ${input.xp}, ${todayIst}, now())
      ON CONFLICT (student_id, activity_type, reference_id) DO NOTHING
      RETURNING xp_awarded
    ),
    stats AS (
      INSERT INTO student_stats
        (student_id, college_id, total_xp, current_level, current_streak, longest_streak, dsa_solved_count, last_activity_date_ist, updated_at)
      SELECT s.id, s.college_id, ins.xp_awarded, (ins.xp_awarded / 100) + 1, 1, 1, ${dsaIncrement}, ${todayIst}, now()
      FROM ins JOIN students s ON s.id = ${input.studentId}
      WHERE s.college_id IS NOT NULL
      ON CONFLICT (student_id) DO UPDATE SET
        total_xp = student_stats.total_xp + EXCLUDED.total_xp,
        current_level = ((student_stats.total_xp + EXCLUDED.total_xp) / 100) + 1,
        current_streak = ${streakExpr},
        longest_streak = GREATEST(student_stats.longest_streak, ${streakExpr}),
        dsa_solved_count = student_stats.dsa_solved_count + EXCLUDED.dsa_solved_count,
        last_activity_date_ist = EXCLUDED.last_activity_date_ist,
        updated_at = now()
      RETURNING student_stats.total_xp
    )
    SELECT (SELECT count(*)::int FROM ins) AS inserted`;
}

/** Idempotent, race-safe XP award. */
export async function awardActivityXp(input: AwardXpInput, client: ExecutingClient): Promise<AwardXpResult> {
  if (!Number.isInteger(input.xp) || input.xp < 0) throw new Error('XP amount must be a non-negative integer.');
  const todayIst = istDate(input.now ?? new Date());
  const result = await client.execute(buildAwardXpStatement(input, todayIst, previousIstDate(todayIst)));
  const rows = (result as { rows?: Array<{ inserted: number | string }> } | undefined)?.rows ?? [];
  const awarded = Number(rows[0]?.inserted ?? 0) > 0;
  return { awarded, xpAwarded: awarded ? input.xp : 0 };
}
