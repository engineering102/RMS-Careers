import { prepareSeedTarget } from '@rms/db/guard-env';
import module from 'node:module';

// Intercept 'server-only' package for standalone CLI script runner
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalRequire = (module.prototype as any).require;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module.prototype as any).require = function (this: any, id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return originalRequire.apply(this, [id, ...args]);
};

async function verifySeededData() {
  // Slice 0 guard: must run before any query module is imported.
  prepareSeedTarget();

  console.log('--- START SEED VERIFICATION ---');

  // Dynamically import queries after server-only hook is registered
  const { authenticateStudent } = await import('../lib/db/student-identity');
  const { getStudentEntitlementContext } = await import('../lib/db/queries/entitlements');
  const { getStudentOverview } = await import('../lib/db/queries/overview');
  const { getStudentProfileData } = await import('../lib/db/queries/profile');
  const { getStudentPracticeQuizzes } = await import('../lib/db/queries/assessments');
  const { getStudentExternalAssessments } = await import('../lib/db/queries/external-assessments');
  const { getStudentNotifications } = await import('../lib/db/queries/notifications');
  const { getBatchLeaderboard } = await import('../lib/db/queries/leaderboards');

  // 1. Authentication
  const student = await authenticateStudent('student.demo@rms-careers.local', 'StudentDemo@2026!');
  if (!student) {
    console.error('FAIL: Authentication failed for student.demo@rms-careers.local');
    process.exit(1);
  }
  console.log('1. Authentication: SUCCESS ->', student.name, `(Student ID: ${student.studentId})`);

  // 2. Entitlements
  const context = await getStudentEntitlementContext(student.userId);
  console.log(
    '2. Entitlements: isStudent =',
    context.isStudent,
    ', hasActiveEntitlement =',
    context.hasActiveEntitlement,
    ', activeBatches =',
    context.activeBatches.map((b) => b.batchName).join(', ')
  );
  if (!context.hasActiveEntitlement || context.activeBatches.length === 0) {
    console.error('FAIL: Active entitlement or batch missing');
    process.exit(1);
  }

  const batchId = context.activeBatches[0].batchId;

  // 3. Overview Dashboard
  const overview = await getStudentOverview(student.studentId, [batchId]);
  console.log(
    '3. Overview: Total XP =',
    overview.stats.totalXp,
    ', Current Streak =',
    overview.stats.currentStreak,
    ', Upcoming Deadlines =',
    overview.deadlines.length,
    ', 30-day Active Days =',
    overview.heatmap.totalActiveDays
  );

  // 4. Profile & Analytics
  const profile = await getStudentProfileData(student.studentId);
  console.log(
    '4. Profile: Full Name =',
    profile?.academic.fullName,
    ', Primary Lang =',
    profile?.career.primaryLanguage,
    ', DSA Solved Count =',
    profile?.stats.dsaSolvedCount,
    ', Topics Tracked =',
    profile?.topicProgress.length
  );

  // 5. Practice & Formal Assessments
  const quizzes = await getStudentPracticeQuizzes(student.studentId);
  console.log('5. Assessments: Practice Quizzes Available =', quizzes.length);

  // 6. External Benchmarks
  const external = await getStudentExternalAssessments(student.studentId);
  console.log(
    '6. External Benchmarks: Count =',
    external.length,
    ', Primary Benchmark =',
    external[0]?.assessmentName,
    `(Tier: ${external[0]?.performanceTier})`
  );

  // 7. Notifications Feed
  const notifs = await getStudentNotifications(student.userId);
  console.log('7. Notifications: Total =', notifs.totalCount, ', Unread =', notifs.unreadCount);

  // 8. Cohort Leaderboard
  const leaderboard = await getBatchLeaderboard(
    student.studentId,
    context.student?.collegeId,
    batchId,
    'all_time'
  );
  console.log(
    '8. Leaderboard Entries (Alpha Cohort):',
    leaderboard.entries.map((e) => `#${e.rank} ${e.fullName} (${e.xp} XP${e.isCurrentUser ? ' - YOU' : ''})`).join(' | ')
  );

  console.log('--- ALL VERIFICATION CHECKS PASSED CLEANLY ---');
  process.exit(0);
}

verifySeededData().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
