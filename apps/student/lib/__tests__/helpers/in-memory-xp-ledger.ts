import { getTodayDateIst, getYesterdayDateIst } from '@/lib/services/activity-reward';

/**
 * Unit-tier stand-in for lib/services/xp-ledger.ts with the same contract as its SQL statement:
 * the ledger row is unique per (student, activity type, reference); student_stats change only when
 * that row is new; the streak advances on consecutive IST days. The SQL itself is covered by
 * xp-ledger.test.ts (shape) and assessment-concurrency.int.test.ts (live database).
 */
export function createInMemoryXpLedger(state: () => { activities: any[]; stats: any[] }) {
  return {
    awardActivityXp: async (input: {
      studentId: number;
      batchId: string | null;
      activityType: string;
      referenceId: string;
      xp: number;
      now?: Date;
    }) => {
      const { activities, stats } = state();
      const duplicate = activities.some(
        (a) => a.studentId === input.studentId && a.activityType === input.activityType && a.referenceId === input.referenceId
      );
      if (duplicate) return { awarded: false, xpAwarded: 0 };

      const todayIst = getTodayDateIst(input.now ?? new Date());
      activities.push({
        id: activities.length + 1,
        studentId: input.studentId,
        batchId: input.batchId,
        activityType: input.activityType,
        referenceId: input.referenceId,
        xpAwarded: input.xp,
        activityDateIst: todayIst,
        createdAt: new Date()
      });

      const row = stats.find((s) => s.studentId === input.studentId);
      if (row) {
        const yesterdayIst = getYesterdayDateIst(todayIst);
        const streak =
          row.lastActivityDateIst === todayIst
            ? row.currentStreak
            : row.lastActivityDateIst === yesterdayIst
              ? row.currentStreak + 1
              : 1;
        row.totalXp += input.xp;
        row.currentLevel = Math.floor(row.totalXp / 100) + 1;
        row.currentStreak = streak;
        row.longestStreak = Math.max(row.longestStreak ?? 0, streak);
        if (input.activityType === 'dsa_solved') row.dsaSolvedCount = (row.dsaSolvedCount ?? 0) + 1;
        row.lastActivityDateIst = todayIst;
      }
      return { awarded: true, xpAwarded: input.xp };
    }
  };
}
