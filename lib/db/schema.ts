import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
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
  'cancelled'
]);

// Programs Table
export const programs = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  status: programStatusEnum('status').notNull().default('draft'),
  capacity: integer('capacity').notNull().default(0),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Students Table
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  collegeRollNumber: text('college_roll_number'),
  branch: text('branch'),
  year: integer('year'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Enrollments Table
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
    status: enrollmentStatusEnum('status').notNull().default('pending'),
    confirmationSentAt: timestamp('confirmation_sent_at'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    uniqueStudentProgram: uniqueIndex('student_program_idx').on(
      table.studentId,
      table.programId
    )
  })
);

// Relations
export const programsRelations = relations(programs, ({ many }) => ({
  enrollments: many(enrollments)
}));

export const studentsRelations = relations(students, ({ many }) => ({
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
  })
}));

// Infer Types
export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;

// Zod Validation Schemas
export const insertProgramSchema = createInsertSchema(programs);
export const selectProgramSchema = createSelectSchema(programs);

export const insertStudentSchema = createInsertSchema(students);
export const selectStudentSchema = createSelectSchema(students);

export const insertEnrollmentSchema = createInsertSchema(enrollments);
export const selectEnrollmentSchema = createSelectSchema(enrollments);
