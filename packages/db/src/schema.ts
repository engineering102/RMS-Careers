import {
  pgTable,
  uuid,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
  varchar,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Status Enums
export const programStatusEnum = pgEnum('program_status', [
  'draft',
  'active',
  'archived'
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'pending',
  'confirmed',
  'waitlisted',
  'cancelled',
  'active',
  'transferred',
  'completed',
  'dropped'
]);

export const userStatusEnum = pgEnum('user_status', [
  'pending_activation',
  'active',
  'suspended',
  'archived'
]);

export const roleEnum = pgEnum('role', [
  'super_admin',
  'admin',
  'tutor',
  'student'
]);
export type RoleEnum = (typeof roleEnum.enumValues)[number];

export const tokenTypeEnum = pgEnum('token_type', [
  'activation',
  'password_reset'
]);
export type TokenTypeEnum = (typeof tokenTypeEnum.enumValues)[number];

// Student Platform Enums
export const contentTypeEnum = pgEnum('content_type', [
  'lecture',
  'notes',
  'dsa_sheet',
  'quiz',
  'project',
  'resource'
]);
export type ContentTypeEnum = (typeof contentTypeEnum.enumValues)[number];

export const quizTypeEnum = pgEnum('quiz_type', [
  'practice',
  'formal'
]);
export type QuizTypeEnum = (typeof quizTypeEnum.enumValues)[number];

export const explanationPolicyEnum = pgEnum('explanation_policy', [
  'immediate',
  'after_deadline',
  'never'
]);
export type ExplanationPolicyEnum = (typeof explanationPolicyEnum.enumValues)[number];

export const questionTypeEnum = pgEnum('question_type', [
  'single_choice',
  'multiple_choice'
]);
export type QuestionTypeEnum = (typeof questionTypeEnum.enumValues)[number];

export const submissionStatusEnum = pgEnum('submission_status', [
  'submitted',
  'under_review',
  'approved',
  'resubmission_requested'
]);
export type SubmissionStatusEnum = (typeof submissionStatusEnum.enumValues)[number];

export const activityTypeEnum = pgEnum('activity_type', [
  'dsa_solved',
  'lecture_completed',
  'quiz_completed',
  'assignment_approved',
  'external_assessment'
]);
export type ActivityTypeEnum = (typeof activityTypeEnum.enumValues)[number];

// ==========================================
// 1. INSTITUTIONS / COLLEGES
// ==========================================
export const colleges = pgTable('colleges', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  city: text('city'),
  state: text('state'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// ==========================================
// 2. USERS & ROLES
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  status: userStatusEnum('status').notNull().default('active'),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const userRoles = pgTable(
  'user_roles',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userRoleIdx: uniqueIndex('user_role_idx').on(table.userId, table.role)
  })
);

// Account Tokens (Single-use, expiring SHA-256 tokens)
export const accountTokens = pgTable(
  'account_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    tokenType: tokenTypeEnum('token_type').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashIdx: index('token_hash_idx').on(table.tokenHash)
  })
);

// ==========================================
// 3. TUTORS & PROFILES
// ==========================================
export const tutors = pgTable('tutors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  headline: text('headline'),
  bio: text('bio'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// ==========================================
// 4. STUDENTS
// ==========================================
export const students = pgTable(
  'students',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
    collegeId: uuid('college_id').references(() => colleges.id, { onDelete: 'restrict' }),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    collegeRollNumber: text('college_roll_number'),
    branch: text('branch'),
    year: integer('year'),
    githubUrl: text('github_url'),
    linkedinUrl: text('linkedin_url'),
    portfolioUrl: text('portfolio_url'),
    targetCompanies: text('target_companies'),
    primaryLanguage: text('primary_language'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    studentsCollegeIdx: index('students_college_id_idx').on(table.collegeId),
    collegeRollIdx: uniqueIndex('college_roll_idx').on(table.collegeId, table.collegeRollNumber)
  })
);

// Student Stats (retains college_id for fast leaderboard indexing; must sync with students.college_id)
export const studentStats = pgTable(
  'student_stats',
  {
    studentId: integer('student_id')
      .primaryKey()
      .references(() => students.id, { onDelete: 'cascade' }),
    collegeId: uuid('college_id')
      .notNull()
      .references(() => colleges.id, { onDelete: 'cascade' }),
    totalXp: integer('total_xp').notNull().default(0),
    currentLevel: integer('current_level').notNull().default(1),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    dsaSolvedCount: integer('dsa_solved_count').notNull().default(0),
    lastActivityDateIst: varchar('last_activity_date_ist', { length: 10 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    collegeLeaderboardIdx: index('college_leaderboard_idx').on(
      table.collegeId,
      table.totalXp
    )
  })
);

// ==========================================
// 5. PROGRAMS, BATCHES & ENROLLMENTS
// ==========================================
export const programs = pgTable(
  'programs',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    description: text('description'),
    status: programStatusEnum('status').notNull().default('draft'),
    capacity: integer('capacity').notNull().default(0),
    collegeId: uuid('college_id').references(() => colleges.id, { onDelete: 'set null' }),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    programsCollegeIdx: index('programs_college_id_idx').on(table.collegeId)
  })
);

export const batches = pgTable(
  'batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    programId: integer('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    collegeId: uuid('college_id')
      .notNull()
      .references(() => colleges.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    batchProgramIdx: index('batches_program_id_idx').on(table.programId),
    batchCollegeIdx: index('batches_college_id_idx').on(table.collegeId)
  })
);

export const tutorBatchAssignments = pgTable(
  'tutor_batch_assignments',
  {
    id: serial('id').primaryKey(),
    tutorId: uuid('tutor_id')
      .notNull()
      .references(() => tutors.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    tutorBatchIdx: uniqueIndex('tutor_batch_idx').on(table.tutorId, table.batchId)
  })
);

export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    programId: integer('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'restrict' }),
    status: enrollmentStatusEnum('status').notNull().default('pending'),
    transferredAt: timestamp('transferred_at', { withTimezone: true }),
    confirmationSentAt: timestamp('confirmation_sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniqueActiveEnrollmentIdx: uniqueIndex('unique_active_enrollment_idx')
      .on(table.studentId, table.programId)
      .where(sql`status IN ('active', 'confirmed')`),
    enrollmentStudentIdx: index('enrollments_student_id_idx').on(table.studentId),
    enrollmentProgramIdx: index('enrollments_program_id_idx').on(table.programId),
    enrollmentBatchIdx: index('enrollments_batch_id_idx').on(table.batchId)
  })
);

// ==========================================
// 6. CONTENT, CURRICULUM & ASSESSMENTS
// ==========================================

export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    programId: integer('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    contentType: contentTypeEnum('content_type').notNull(),
    description: text('description'),
    metadata: jsonb('metadata').notNull().default({}),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contentProgramSlugIdx: uniqueIndex('content_program_slug_idx').on(
      table.programId,
      table.slug
    ),
    contentTypeIdx: index('content_type_idx').on(table.contentType)
  })
);

export const batchCurriculum = pgTable(
  'batch_curriculum',
  {
    id: serial('id').primaryKey(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, { onDelete: 'cascade' }),
    contentItemId: uuid('content_item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    weekNumber: integer('week_number').notNull(),
    sequenceOrder: integer('sequence_order').notNull().default(0),
    availableFrom: timestamp('available_from', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    batchContentIdx: uniqueIndex('batch_content_idx').on(
      table.batchId,
      table.contentItemId
    ),
    batchTimelineIdx: index('batch_timeline_idx').on(
      table.batchId,
      table.weekNumber,
      table.sequenceOrder
    )
  })
);

export const quizzes = pgTable('quizzes', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentItemId: uuid('content_item_id')
    .notNull()
    .unique()
    .references(() => contentItems.id, { onDelete: 'cascade' }),
  quizType: quizTypeEnum('quiz_type').notNull(),
  timeLimitMinutes: integer('time_limit_minutes'),
  passingScorePercent: integer('passing_score_percent').notNull().default(60),
  showExplanations: explanationPolicyEnum('show_explanations').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: serial('id').primaryKey(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    questionType: questionTypeEnum('question_type').notNull(),
    options: jsonb('options').notNull(),
    correctOptionIds: jsonb('correct_option_ids').notNull(),
    explanationText: text('explanation_text'),
    points: integer('points').notNull().default(1),
    sequenceOrder: integer('sequence_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    quizQuestionsQuizIdx: index('quiz_questions_quiz_id_idx').on(
      table.quizId,
      table.sequenceOrder
    )
  })
);

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
    score: integer('score').notNull().default(0),
    maxScore: integer('max_score').notNull(),
    isPassed: boolean('is_passed').notNull().default(false),
    responses: jsonb('responses').notNull().default({}),
    tabBlurCount: integer('tab_blur_count').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
  },
  (table) => ({
    studentQuizAttemptsIdx: index('student_quiz_attempts_idx').on(
      table.studentId,
      table.quizId
    )
  })
);

export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentItemId: uuid('content_item_id')
    .notNull()
    .unique()
    .references(() => contentItems.id, { onDelete: 'cascade' }),
  rubricCriteria: jsonb('rubric_criteria').notNull().default([]),
  maxScore: integer('max_score').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, { onDelete: 'cascade' }),
    githubUrl: text('github_url').notNull(),
    liveUrl: text('live_url'),
    notes: text('notes'),
    status: submissionStatusEnum('status').notNull().default('submitted'),
    score: integer('score'),
    tutorFeedback: text('tutor_feedback'),
    reviewedByTutorId: uuid('reviewed_by_tutor_id').references(() => tutors.id, {
      onDelete: 'set null'
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    studentAssignmentBatchIdx: uniqueIndex('student_assignment_batch_idx').on(
      table.studentId,
      table.assignmentId,
      table.batchId
    )
  })
);

export const studentDsaProgress = pgTable(
  'student_dsa_progress',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    problemSlug: text('problem_slug').notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    submissionUrl: text('submission_url'),
    notes: text('notes'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    studentProblemIdx: uniqueIndex('student_problem_idx').on(
      table.studentId,
      table.problemSlug
    )
  })
);

export const activities = pgTable(
  'activities',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id').references(() => batches.id, { onDelete: 'set null' }),
    activityType: activityTypeEnum('activity_type').notNull(),
    referenceId: text('reference_id').notNull(),
    xpAwarded: integer('xp_awarded').notNull(),
    activityDateIst: varchar('activity_date_ist', { length: 10 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    activityIdempotencyIdx: uniqueIndex('activity_idempotency_idx').on(
      table.studentId,
      table.activityType,
      table.referenceId
    ),
    activityStreakIdx: index('activity_streak_idx').on(
      table.studentId,
      table.activityDateIst
    )
  })
);

export const externalAssessmentRecords = pgTable(
  'external_assessment_records',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, { onDelete: 'cascade' }),
    assessmentCode: text('assessment_code').notNull(),
    assessmentName: text('assessment_name').notNull(),
    provider: text('provider').notNull(),
    maxScore: integer('max_score').notNull(),
    obtainedScore: integer('obtained_score').notNull(),
    percentile: integer('percentile'),
    importedByUserId: uuid('imported_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    studentExternalAssessmentIdx: uniqueIndex('student_external_assessment_idx').on(
      table.studentId,
      table.batchId,
      table.assessmentCode
    )
  })
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    actionUrl: text('action_url'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userNotificationsIdx: index('user_notifications_idx').on(
      table.userId,
      table.isRead,
      table.createdAt
    )
  })
);

// ==========================================
// 7. RELATIONS
// ==========================================
export const collegesRelations = relations(colleges, ({ many }) => ({
  students: many(students),
  programs: many(programs),
  batches: many(batches),
  studentStats: many(studentStats)
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  student: one(students, {
    fields: [users.id],
    references: [students.userId]
  }),
  tutor: one(tutors, {
    fields: [users.id],
    references: [tutors.userId]
  }),
  accountTokens: many(accountTokens),
  notifications: many(notifications)
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  })
}));

export const accountTokensRelations = relations(accountTokens, ({ one }) => ({
  user: one(users, {
    fields: [accountTokens.userId],
    references: [users.id]
  })
}));

export const tutorsRelations = relations(tutors, ({ one, many }) => ({
  user: one(users, {
    fields: [tutors.userId],
    references: [users.id]
  }),
  batchAssignments: many(tutorBatchAssignments),
  reviewedSubmissions: many(assignmentSubmissions)
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  program: one(programs, {
    fields: [batches.programId],
    references: [programs.id]
  }),
  college: one(colleges, {
    fields: [batches.collegeId],
    references: [colleges.id]
  }),
  enrollments: many(enrollments),
  tutorAssignments: many(tutorBatchAssignments),
  curriculum: many(batchCurriculum),
  assignmentSubmissions: many(assignmentSubmissions),
  externalAssessments: many(externalAssessmentRecords),
  activities: many(activities),
  quizAttempts: many(quizAttempts)
}));

export const tutorBatchAssignmentsRelations = relations(tutorBatchAssignments, ({ one }) => ({
  tutor: one(tutors, {
    fields: [tutorBatchAssignments.tutorId],
    references: [tutors.id]
  }),
  batch: one(batches, {
    fields: [tutorBatchAssignments.batchId],
    references: [batches.id]
  })
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id]
  }),
  college: one(colleges, {
    fields: [students.collegeId],
    references: [colleges.id]
  }),
  stats: one(studentStats, {
    fields: [students.id],
    references: [studentStats.studentId]
  }),
  enrollments: many(enrollments),
  quizAttempts: many(quizAttempts),
  assignmentSubmissions: many(assignmentSubmissions),
  dsaProgress: many(studentDsaProgress),
  activities: many(activities),
  externalAssessments: many(externalAssessmentRecords)
}));

export const studentStatsRelations = relations(studentStats, ({ one }) => ({
  student: one(students, {
    fields: [studentStats.studentId],
    references: [students.id]
  }),
  college: one(colleges, {
    fields: [studentStats.collegeId],
    references: [colleges.id]
  })
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  college: one(colleges, {
    fields: [programs.collegeId],
    references: [colleges.id]
  }),
  batches: many(batches),
  enrollments: many(enrollments),
  contentItems: many(contentItems)
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id]
  }),
  program: one(programs, {
    fields: [enrollments.programId],
    references: [programs.id]
  }),
  batch: one(batches, {
    fields: [enrollments.batchId],
    references: [batches.id]
  })
}));

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  program: one(programs, {
    fields: [contentItems.programId],
    references: [programs.id]
  }),
  batchCurriculum: many(batchCurriculum),
  quiz: one(quizzes, {
    fields: [contentItems.id],
    references: [quizzes.contentItemId]
  }),
  assignment: one(assignments, {
    fields: [contentItems.id],
    references: [assignments.contentItemId]
  })
}));

export const batchCurriculumRelations = relations(batchCurriculum, ({ one }) => ({
  batch: one(batches, {
    fields: [batchCurriculum.batchId],
    references: [batches.id]
  }),
  contentItem: one(contentItems, {
    fields: [batchCurriculum.contentItemId],
    references: [contentItems.id]
  })
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  contentItem: one(contentItems, {
    fields: [quizzes.contentItemId],
    references: [contentItems.id]
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts)
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id]
  })
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id]
  }),
  student: one(students, {
    fields: [quizAttempts.studentId],
    references: [students.id]
  }),
  batch: one(batches, {
    fields: [quizAttempts.batchId],
    references: [batches.id]
  })
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  contentItem: one(contentItems, {
    fields: [assignments.contentItemId],
    references: [contentItems.id]
  }),
  submissions: many(assignmentSubmissions)
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [assignments.id]
  }),
  student: one(students, {
    fields: [assignmentSubmissions.studentId],
    references: [students.id]
  }),
  batch: one(batches, {
    fields: [assignmentSubmissions.batchId],
    references: [batches.id]
  }),
  reviewedByTutor: one(tutors, {
    fields: [assignmentSubmissions.reviewedByTutorId],
    references: [tutors.id]
  })
}));

export const studentDsaProgressRelations = relations(studentDsaProgress, ({ one }) => ({
  student: one(students, {
    fields: [studentDsaProgress.studentId],
    references: [students.id]
  })
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  student: one(students, {
    fields: [activities.studentId],
    references: [students.id]
  }),
  batch: one(batches, {
    fields: [activities.batchId],
    references: [batches.id]
  })
}));

export const externalAssessmentRecordsRelations = relations(
  externalAssessmentRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [externalAssessmentRecords.studentId],
      references: [students.id]
    }),
    batch: one(batches, {
      fields: [externalAssessmentRecords.batchId],
      references: [batches.id]
    }),
    importedByUser: one(users, {
      fields: [externalAssessmentRecords.importedByUserId],
      references: [users.id]
    })
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

// ==========================================
// 8. INFERRED TYPES
// ==========================================
export type College = typeof colleges.$inferSelect;
export type NewCollege = typeof colleges.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type AccountToken = typeof accountTokens.$inferSelect;
export type NewAccountToken = typeof accountTokens.$inferInsert;

export type Tutor = typeof tutors.$inferSelect;
export type NewTutor = typeof tutors.$inferInsert;

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;

export type TutorBatchAssignment = typeof tutorBatchAssignments.$inferSelect;
export type NewTutorBatchAssignment = typeof tutorBatchAssignments.$inferInsert;

export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type StudentStat = typeof studentStats.$inferSelect;
export type NewStudentStat = typeof studentStats.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;

export type BatchCurriculum = typeof batchCurriculum.$inferSelect;
export type NewBatchCurriculum = typeof batchCurriculum.$inferInsert;

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;

export type StudentDsaProgress = typeof studentDsaProgress.$inferSelect;
export type NewStudentDsaProgress = typeof studentDsaProgress.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

export type ExternalAssessmentRecord = typeof externalAssessmentRecords.$inferSelect;
export type NewExternalAssessmentRecord = typeof externalAssessmentRecords.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ==========================================
// 9. ZOD VALIDATION SCHEMAS
// ==========================================
export const insertCollegeSchema = createInsertSchema(colleges);
export const selectCollegeSchema = createSelectSchema(colleges);

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const selectUserRoleSchema = createSelectSchema(userRoles);

export const insertAccountTokenSchema = createInsertSchema(accountTokens);
export const selectAccountTokenSchema = createSelectSchema(accountTokens);

export const insertTutorSchema = createInsertSchema(tutors);
export const selectTutorSchema = createSelectSchema(tutors);

export const insertBatchSchema = createInsertSchema(batches);
export const selectBatchSchema = createSelectSchema(batches);

export const insertTutorBatchAssignmentSchema = createInsertSchema(tutorBatchAssignments);
export const selectTutorBatchAssignmentSchema = createSelectSchema(tutorBatchAssignments);

export const insertProgramSchema = createInsertSchema(programs);
export const selectProgramSchema = createSelectSchema(programs);

export const insertStudentSchema = createInsertSchema(students);
export const selectStudentSchema = createSelectSchema(students);

export const insertStudentStatSchema = createInsertSchema(studentStats);
export const selectStudentStatSchema = createSelectSchema(studentStats);

export const insertEnrollmentSchema = createInsertSchema(enrollments);
export const selectEnrollmentSchema = createSelectSchema(enrollments);

export const insertContentItemSchema = createInsertSchema(contentItems);
export const selectContentItemSchema = createSelectSchema(contentItems);

export const insertBatchCurriculumSchema = createInsertSchema(batchCurriculum);
export const selectBatchCurriculumSchema = createSelectSchema(batchCurriculum);

export const insertQuizSchema = createInsertSchema(quizzes);
export const selectQuizSchema = createSelectSchema(quizzes);

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions);
export const selectQuizQuestionSchema = createSelectSchema(quizQuestions);

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts);
export const selectQuizAttemptSchema = createSelectSchema(quizAttempts);

export const insertAssignmentSchema = createInsertSchema(assignments);
export const selectAssignmentSchema = createSelectSchema(assignments);

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions);
export const selectAssignmentSubmissionSchema = createSelectSchema(assignmentSubmissions);

export const insertStudentDsaProgressSchema = createInsertSchema(studentDsaProgress);
export const selectStudentDsaProgressSchema = createSelectSchema(studentDsaProgress);

export const insertActivitySchema = createInsertSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);

export const insertExternalAssessmentRecordSchema = createInsertSchema(
  externalAssessmentRecords
);
export const selectExternalAssessmentRecordSchema = createSelectSchema(
  externalAssessmentRecords
);

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
