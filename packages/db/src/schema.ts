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
  varchar
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
// 6. RELATIONS
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
  accountTokens: many(accountTokens)
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
  batchAssignments: many(tutorBatchAssignments)
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
  tutorAssignments: many(tutorBatchAssignments)
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
  enrollments: many(enrollments)
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
  enrollments: many(enrollments)
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

// ==========================================
// 7. INFERRED TYPES
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

// ==========================================
// 8. ZOD VALIDATION SCHEMAS
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
