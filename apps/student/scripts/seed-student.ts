import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '@rms/db/schema';
import { hashPassword } from '@rms/auth';
import { prepareSeedTarget } from '@rms/db/guard-env';

// ============================================================================
// CONSTANTS & SEED SPECIFICATIONS
// ============================================================================
export const DEMO_PASSWORD = 'StudentDemo@2026!';

export const PRIMARY_DEMO_STUDENT = {
  email: 'student.demo@rms-careers.local',
  name: 'Aarav Sharma',
  rollNumber: '2022-CSE-001',
  branch: 'Computer Science & Engineering',
  year: 4,
  phone: '+91 98765 43210',
  githubUrl: 'https://github.com/aarav-sharma-demo',
  linkedinUrl: 'https://linkedin.com/in/aarav-sharma-demo',
  portfolioUrl: 'https://aaravsharma-dev.local',
  targetCompanies: 'Google, Microsoft, Amazon',
  primaryLanguage: 'TypeScript',
  totalXp: 1450,
  currentLevel: 3,
  currentStreak: 5,
  longestStreak: 12,
  dsaSolvedCount: 6
};

export const PEER_DEMO_STUDENTS = [
  {
    email: 'peer.demo@rms-careers.local',
    name: 'Riya Patel',
    rollNumber: '2022-CSE-002',
    branch: 'Computer Science & Engineering',
    year: 4,
    phone: '+91 98765 43211',
    githubUrl: 'https://github.com/riya-patel-demo',
    linkedinUrl: 'https://linkedin.com/in/riya-patel-demo',
    primaryLanguage: 'Python',
    totalXp: 820,
    currentLevel: 2,
    currentStreak: 3,
    longestStreak: 7,
    dsaSolvedCount: 3
  },
  {
    email: 'topper.demo@rms-careers.local',
    name: 'Siddharth Verma',
    rollNumber: '2022-CSE-003',
    branch: 'Computer Science & Engineering',
    year: 4,
    phone: '+91 98765 43212',
    githubUrl: 'https://github.com/siddharth-verma-demo',
    linkedinUrl: 'https://linkedin.com/in/siddharth-verma-demo',
    primaryLanguage: 'Java',
    totalXp: 2350,
    currentLevel: 5,
    currentStreak: 8,
    longestStreak: 21,
    dsaSolvedCount: 14
  },
  {
    email: 'beta.demo@rms-careers.local',
    name: 'Ananya Reddy',
    rollNumber: '2022-ECE-010',
    branch: 'Electronics & Communication',
    year: 4,
    phone: '+91 98765 43213',
    githubUrl: 'https://github.com/ananya-reddy-demo',
    primaryLanguage: 'C++',
    totalXp: 1100,
    currentLevel: 3,
    currentStreak: 4,
    longestStreak: 9,
    dsaSolvedCount: 5
  },
  {
    email: 'external.demo@rms-careers.local',
    name: 'Vikram Kulkarni',
    rollNumber: '2023-IT-005',
    branch: 'Information Technology',
    year: 3,
    phone: '+91 98765 43214',
    githubUrl: 'https://github.com/vikram-kulkarni-demo',
    primaryLanguage: 'Go',
    totalXp: 1900,
    currentLevel: 4,
    currentStreak: 6,
    longestStreak: 15,
    dsaSolvedCount: 9
  }
];

function getIstDate(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

// ============================================================================
// MAIN SEED EXECUTION
// ============================================================================
async function runStudentSeeder() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SAFETY ERROR] Seeding is strictly forbidden in production (NODE_ENV=production).');
    process.exit(1);
  }

  // Slice 0 guard: explicit --target=test|development; production/unknown/missing are rejected.
  const { url: connectionString } = prepareSeedTarget();

  console.log('=================================================================');
  console.log('       RMS CAREERS — STUDENT DEMO DATASET SEEDER (DEV ONLY)      ');
  console.log('=================================================================');
  console.log(`[INIT] Connecting to PostgreSQL database...`);

  const sqlClient = neon(connectionString);
  const db = drizzle(sqlClient, { schema });

  const todayIst = getIstDate(0);
  console.log(`[INFO] Current Asia/Kolkata Reference Date: ${todayIst}`);

  const defaultPasswordHash = await hashPassword(DEMO_PASSWORD);

  // --------------------------------------------------------------------------
  // 1. INSTITUTIONS / COLLEGES
  // --------------------------------------------------------------------------
  console.log('\n[1/12] Seeding Demo Institutions...');

  async function getOrCreateCollege(code: string, name: string, city: string, state: string) {
    const [existing] = await db
      .select()
      .from(schema.colleges)
      .where(eq(schema.colleges.code, code))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [inserted] = await db
      .insert(schema.colleges)
      .values({ code, name, city, state, isActive: true })
      .returning();
    return inserted;
  }

  const college1 = await getOrCreateCollege(
    'DEMO-COLL-01',
    'Apex Institute of Technology (Demo)',
    'Hyderabad',
    'Telangana'
  );

  const college2 = await getOrCreateCollege(
    'DEMO-COLL-02',
    'Beacon University of Engineering (Demo)',
    'Bengaluru',
    'Karnataka'
  );

  console.log(`  ✓ College 1: ${college1.name} (Code: ${college1.code})`);
  console.log(`  ✓ College 2: ${college2.name} (Code: ${college2.code})`);

  // --------------------------------------------------------------------------
  // 2. ACADEMIC PROGRAMS
  // --------------------------------------------------------------------------
  console.log('\n[2/12] Seeding Academic Programs...');

  async function getOrCreateProgram(code: string, name: string, collegeId: string, capacity: number) {
    const [existing] = await db
      .select()
      .from(schema.programs)
      .where(eq(schema.programs.code, code))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [inserted] = await db
      .insert(schema.programs)
      .values({
        code,
        name,
        collegeId,
        capacity,
        status: 'active',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      })
      .returning();
    return inserted;
  }

  const program1 = await getOrCreateProgram(
    'DEMO-PROG-CS-2026',
    'B.Tech Computer Science & Systems Engineering (2026)',
    college1.id,
    120
  );

  const program2 = await getOrCreateProgram(
    'DEMO-PROG-IT-2026',
    'B.Tech Information Technology & Cloud Architecture (2026)',
    college2.id,
    60
  );

  console.log(`  ✓ Program 1: ${program1.name} (Code: ${program1.code})`);
  console.log(`  ✓ Program 2: ${program2.name} (Code: ${program2.code})`);

  // --------------------------------------------------------------------------
  // 3. COHORT BATCHES
  // --------------------------------------------------------------------------
  console.log('\n[3/12] Seeding Cohort Batches...');

  async function getOrCreateBatch(programId: number, collegeId: string, name: string) {
    const [existing] = await db
      .select()
      .from(schema.batches)
      .where(and(eq(schema.batches.programId, programId), eq(schema.batches.name, name)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [inserted] = await db
      .insert(schema.batches)
      .values({
        programId,
        collegeId,
        name,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      })
      .returning();
    return inserted;
  }

  // Batch 1: Primary Cohort (College 1, Program 1)
  const batch1 = await getOrCreateBatch(program1.id, college1.id, 'Alpha Cohort 2026');
  // Batch 2: Secondary Cohort in same college (for isolation testing)
  const batch2 = await getOrCreateBatch(program1.id, college1.id, 'Beta Cohort 2026');
  // Batch 3: Separate College Cohort (College 2, Program 2)
  const batch3 = await getOrCreateBatch(program2.id, college2.id, 'Gamma Cohort 2026');

  console.log(`  ✓ Batch 1 (Primary): ${batch1.name} (ID: ${batch1.id})`);
  console.log(`  ✓ Batch 2 (Secondary): ${batch2.name} (ID: ${batch2.id})`);
  console.log(`  ✓ Batch 3 (External College): ${batch3.name} (ID: ${batch3.id})`);

  // --------------------------------------------------------------------------
  // 4. USERS & STUDENTS (ACCOUNTS + PROFILES + STATS + ENROLLMENTS)
  // --------------------------------------------------------------------------
  console.log('\n[4/12] Seeding Student Accounts & Profiles...');

  async function seedStudentAccount(data: {
    email: string;
    name: string;
    rollNumber: string;
    branch: string;
    year: number;
    phone: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    targetCompanies?: string;
    primaryLanguage?: string;
    collegeId: string;
    programId: number;
    batchId: string;
    totalXp: number;
    currentLevel: number;
    currentStreak: number;
    longestStreak: number;
    dsaSolvedCount: number;
  }) {
    const cleanEmail = data.email.trim().toLowerCase();

    // A. Users table
    let userId: string;
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(sql`LOWER(${schema.users.email}) = ${cleanEmail}`)
      .limit(1);

    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(schema.users)
        .set({
          passwordHash: defaultPasswordHash,
          status: 'active',
          emailVerifiedAt: existingUser.emailVerifiedAt || new Date()
        })
        .where(eq(schema.users.id, userId));
    } else {
      const [newUser] = await db
        .insert(schema.users)
        .values({
          email: cleanEmail,
          name: data.name,
          passwordHash: defaultPasswordHash,
          status: 'active',
          emailVerifiedAt: new Date()
        })
        .returning();
      userId = newUser.id;
    }

    // B. User role
    const [existingRole] = await db
      .select()
      .from(schema.userRoles)
      .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.role, 'student')))
      .limit(1);

    if (!existingRole) {
      await db.insert(schema.userRoles).values({
        userId,
        role: 'student'
      });
    }

    // C. Students table
    let studentId: number;
    const [existingStudent] = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.userId, userId))
      .limit(1);

    if (existingStudent) {
      studentId = existingStudent.id;
      await db
        .update(schema.students)
        .set({
          collegeId: data.collegeId,
          fullName: data.name,
          phone: data.phone,
          collegeRollNumber: data.rollNumber,
          branch: data.branch,
          year: data.year,
          githubUrl: data.githubUrl || null,
          linkedinUrl: data.linkedinUrl || null,
          portfolioUrl: data.portfolioUrl || null,
          targetCompanies: data.targetCompanies || null,
          primaryLanguage: data.primaryLanguage || null
        })
        .where(eq(schema.students.id, studentId));
    } else {
      const [newStudent] = await db
        .insert(schema.students)
        .values({
          userId,
          collegeId: data.collegeId,
          fullName: data.name,
          email: cleanEmail,
          phone: data.phone,
          collegeRollNumber: data.rollNumber,
          branch: data.branch,
          year: data.year,
          githubUrl: data.githubUrl || null,
          linkedinUrl: data.linkedinUrl || null,
          portfolioUrl: data.portfolioUrl || null,
          targetCompanies: data.targetCompanies || null,
          primaryLanguage: data.primaryLanguage || null
        })
        .returning();
      studentId = newStudent.id;
    }

    // D. Enrollments table
    const [existingEnrollment] = await db
      .select()
      .from(schema.enrollments)
      .where(
        and(
          eq(schema.enrollments.studentId, studentId),
          eq(schema.enrollments.programId, data.programId)
        )
      )
      .limit(1);

    if (existingEnrollment) {
      await db
        .update(schema.enrollments)
        .set({
          batchId: data.batchId,
          status: 'active'
        })
        .where(eq(schema.enrollments.id, existingEnrollment.id));
    } else {
      await db.insert(schema.enrollments).values({
        studentId,
        programId: data.programId,
        batchId: data.batchId,
        status: 'active'
      });
    }

    // E. Student Stats table
    const [existingStats] = await db
      .select()
      .from(schema.studentStats)
      .where(eq(schema.studentStats.studentId, studentId))
      .limit(1);

    if (existingStats) {
      await db
        .update(schema.studentStats)
        .set({
          collegeId: data.collegeId,
          totalXp: data.totalXp,
          currentLevel: data.currentLevel,
          currentStreak: data.currentStreak,
          longestStreak: data.longestStreak,
          dsaSolvedCount: data.dsaSolvedCount,
          lastActivityDateIst: todayIst
        })
        .where(eq(schema.studentStats.studentId, studentId));
    } else {
      await db.insert(schema.studentStats).values({
        studentId,
        collegeId: data.collegeId,
        totalXp: data.totalXp,
        currentLevel: data.currentLevel,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        dsaSolvedCount: data.dsaSolvedCount,
        lastActivityDateIst: todayIst
      });
    }

    return { userId, studentId };
  }

  // Seed Primary Student in Batch 1
  const primaryAccount = await seedStudentAccount({
    ...PRIMARY_DEMO_STUDENT,
    collegeId: college1.id,
    programId: program1.id,
    batchId: batch1.id
  });
  console.log(`  ✓ Primary Student: ${PRIMARY_DEMO_STUDENT.email} (ID: ${primaryAccount.studentId})`);

  // Seed Peer Students
  const peer1 = await seedStudentAccount({
    ...PEER_DEMO_STUDENTS[0],
    collegeId: college1.id,
    programId: program1.id,
    batchId: batch1.id
  });
  console.log(`  ✓ Peer (Alpha Batch): ${PEER_DEMO_STUDENTS[0].email} (ID: ${peer1.studentId})`);

  const topper = await seedStudentAccount({
    ...PEER_DEMO_STUDENTS[1],
    collegeId: college1.id,
    programId: program1.id,
    batchId: batch1.id
  });
  console.log(`  ✓ Topper (Alpha Batch #1): ${PEER_DEMO_STUDENTS[1].email} (ID: ${topper.studentId})`);

  const betaStudent = await seedStudentAccount({
    ...PEER_DEMO_STUDENTS[2],
    collegeId: college1.id,
    programId: program1.id,
    batchId: batch2.id
  });
  console.log(`  ✓ Peer (Beta Batch): ${PEER_DEMO_STUDENTS[2].email} (ID: ${betaStudent.studentId})`);

  const externalStudent = await seedStudentAccount({
    ...PEER_DEMO_STUDENTS[3],
    collegeId: college2.id,
    programId: program2.id,
    batchId: batch3.id
  });
  console.log(`  ✓ External Student (College 2): ${PEER_DEMO_STUDENTS[3].email} (ID: ${externalStudent.studentId})`);

  // --------------------------------------------------------------------------
  // 5. EDUCATIONAL CONTENT CATALOG (`content_items`)
  // --------------------------------------------------------------------------
  console.log('\n[5/12] Seeding Educational Content Catalog...');

  async function getOrCreateContentItem(data: {
    programId: number;
    slug: string;
    title: string;
    contentType: schema.ContentTypeEnum;
    description: string;
    metadata: Record<string, unknown>;
  }) {
    const [existing] = await db
      .select()
      .from(schema.contentItems)
      .where(
        and(
          eq(schema.contentItems.programId, data.programId),
          eq(schema.contentItems.slug, data.slug)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.contentItems)
        .set({
          title: data.title,
          description: data.description,
          metadata: data.metadata,
          isPublished: true
        })
        .where(eq(schema.contentItems.id, existing.id));
      return existing;
    }

    const [inserted] = await db
      .insert(schema.contentItems)
      .values({
        programId: data.programId,
        slug: data.slug,
        title: data.title,
        contentType: data.contentType,
        description: data.description,
        metadata: data.metadata,
        isPublished: true
      })
      .returning();
    return inserted;
  }

  // 1. Lecture 1: Algorithms & Complexity
  const lecture1 = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'intro-to-algorithms-and-complexity',
    title: 'Introduction to Algorithm Design & Asymptotic Complexity',
    contentType: 'lecture',
    description: 'Master asymptotic notations (Big-O, Omega, Theta), recurrence relations, and algorithmic trade-offs.',
    metadata: {
      topic: 'Algorithms & Complexity',
      durationMinutes: 45,
      videoProvider: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      notesMarkdown: '# Asymptotic Analysis\n\nUnderstanding growth rates of functions enables engineering scalable systems.'
    }
  });

  // 2. Lecture 2: Two Pointers
  const lecture2 = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'array-patterns-and-two-pointers',
    title: 'Array Patterns: Sliding Window and Two-Pointer Techniques',
    contentType: 'lecture',
    description: 'Transform O(N²) quadratic nested loops into optimal O(N) linear time scans using pointer invariants.',
    metadata: {
      topic: 'Arrays & Two Pointers',
      durationMinutes: 60,
      videoProvider: 'youtube',
      videoId: 'dQw4w9WgXcQ'
    }
  });

  // 3. Notes: Two Pointers
  const notes1 = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'two-pointer-technique-deep-dive',
    title: 'Two-Pointer Technique: Patterns, Invariants & Tradeoffs',
    contentType: 'notes',
    description: 'Comprehensive engineering guide detailing pointer collision, fast/slow runners, and sliding windows.',
    metadata: {
      topic: 'Arrays & Two Pointers',
      durationMinutes: 20,
      notesMarkdown: '# Two-Pointer Technique\n\n## 1. Opposite Direction\nStart at both ends and advance inwards until pointers meet.'
    }
  });

  // 4. DSA Sheet Content Item
  const dsaSheetItem = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'arrays-and-hashing',
    title: 'Arrays & Hashing Starter Practice Sheet',
    contentType: 'dsa_sheet',
    description: 'Curated problem sheet covering hash lookups, frequency counters, and array manipulation.',
    metadata: {
      topic: 'Arrays & Hashing',
      questionCount: 6
    }
  });

  // 5. Practice Quiz Content Item
  const practiceQuizItem = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'practice-quiz-data-structures-fundamentals',
    title: 'Practice Check: Data Structures & Complexity',
    contentType: 'quiz',
    description: 'Formative knowledge check on time complexities, hash table collision resolution, and array memory layouts.',
    metadata: {
      topic: 'Data Structures',
      durationMinutes: 15
    }
  });

  // 6. Formal Timed Assessment Content Item
  const formalQuizItem = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'midterm-timed-assessment-algorithms',
    title: 'Midterm Formal Timed Assessment: Core Algorithms',
    contentType: 'quiz',
    description: 'Authoritative timed examination testing algorithmic pattern recognition and complexity analysis under time pressure.',
    metadata: {
      topic: 'Algorithms & Complexity',
      durationMinutes: 30
    }
  });

  // 7. Capstone Project Content Item
  const projectItem = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'project-distributed-url-shortener',
    title: 'Capstone Project: High-Performance URL Shortener',
    contentType: 'project',
    description: 'Production-grade backend engineering project with distributed caching, rate-limiting, and analytics.',
    metadata: {
      topic: 'System Design & Backend',
      durationMinutes: 120
    }
  });

  // 8. Upcoming Resource
  const upcomingNotes = await getOrCreateContentItem({
    programId: program1.id,
    slug: 'cloud-microservices-system-design',
    title: 'Microservices Architecture & Event-Driven Patterns',
    contentType: 'resource',
    description: 'Architectural overview of message queues, event sourcing, and transactional outbox patterns.',
    metadata: {
      topic: 'System Design'
    }
  });

  console.log(`  ✓ Seeded 8 curriculum content items across lectures, notes, DSA sheets, quizzes, and projects.`);

  // --------------------------------------------------------------------------
  // 6. BATCH WORKSPACE CURRICULUM (`batch_curriculum`)
  // --------------------------------------------------------------------------
  console.log('\n[6/12] Scheduling Batch Curriculum Timelines...');

  async function scheduleCurriculumItem(
    batchId: string,
    contentItemId: string,
    weekNumber: number,
    sequenceOrder: number,
    availableOffsetDays: number,
    dueOffsetDays?: number
  ) {
    const availableFrom = new Date(Date.now() + availableOffsetDays * 24 * 60 * 60 * 1000);
    const dueAt = dueOffsetDays !== undefined
      ? new Date(Date.now() + dueOffsetDays * 24 * 60 * 60 * 1000)
      : null;

    const [existing] = await db
      .select()
      .from(schema.batchCurriculum)
      .where(
        and(
          eq(schema.batchCurriculum.batchId, batchId),
          eq(schema.batchCurriculum.contentItemId, contentItemId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.batchCurriculum)
        .set({
          weekNumber,
          sequenceOrder,
          availableFrom,
          dueAt
        })
        .where(eq(schema.batchCurriculum.id, existing.id));
      return existing;
    }

    const [inserted] = await db
      .insert(schema.batchCurriculum)
      .values({
        batchId,
        contentItemId,
        weekNumber,
        sequenceOrder,
        availableFrom,
        dueAt
      })
      .returning();
    return inserted;
  }

  // Schedule items for Alpha Cohort (Batch 1)
  await scheduleCurriculumItem(batch1.id, lecture1.id, 1, 1, -25);
  await scheduleCurriculumItem(batch1.id, lecture2.id, 1, 2, -20);
  await scheduleCurriculumItem(batch1.id, notes1.id, 2, 1, -15);
  await scheduleCurriculumItem(batch1.id, dsaSheetItem.id, 2, 2, -10);
  await scheduleCurriculumItem(batch1.id, practiceQuizItem.id, 3, 1, -5);
  // Formal Assessment: due in 7 days (upcoming deadline)
  await scheduleCurriculumItem(batch1.id, formalQuizItem.id, 4, 1, -2, 7);
  // Capstone Project: due in 14 days (upcoming deadline)
  await scheduleCurriculumItem(batch1.id, projectItem.id, 5, 1, -1, 14);
  // Upcoming Microservices Notes: due in 21 days
  await scheduleCurriculumItem(batch1.id, upcomingNotes.id, 6, 1, 5, 21);

  console.log(`  ✓ Scheduled 8 curriculum items into Weeks 1–6 for Alpha Cohort.`);

  // --------------------------------------------------------------------------
  // 7. ASSESSMENTS & QUESTIONS (`quizzes`, `quiz_questions`, `quiz_attempts`)
  // --------------------------------------------------------------------------
  console.log('\n[7/12] Seeding Practice & Formal Timed Assessments...');

  async function getOrCreateQuiz(
    contentItemId: string,
    quizType: schema.QuizTypeEnum,
    timeLimitMinutes: number,
    passingScorePercent: number,
    showExplanations: schema.ExplanationPolicyEnum
  ) {
    const [existing] = await db
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.contentItemId, contentItemId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.quizzes)
        .set({
          quizType,
          timeLimitMinutes,
          passingScorePercent,
          showExplanations
        })
        .where(eq(schema.quizzes.id, existing.id));
      return existing;
    }

    const [inserted] = await db
      .insert(schema.quizzes)
      .values({
        contentItemId,
        quizType,
        timeLimitMinutes,
        passingScorePercent,
        showExplanations
      })
      .returning();
    return inserted;
  }

  // A. Practice Quiz
  const practiceQuiz = await getOrCreateQuiz(
    practiceQuizItem.id,
    'practice',
    15,
    60,
    'immediate'
  );

  // Seed Practice Questions
  async function seedQuizQuestion(
    quizId: string,
    sequenceOrder: number,
    text: string,
    type: schema.QuestionTypeEnum,
    options: Array<{ id: string; text: string }>,
    correctOptionIds: string[],
    explanation: string,
    points = 1
  ) {
    const [existing] = await db
      .select()
      .from(schema.quizQuestions)
      .where(
        and(
          eq(schema.quizQuestions.quizId, quizId),
          eq(schema.quizQuestions.sequenceOrder, sequenceOrder)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.quizQuestions)
        .set({
          questionText: text,
          questionType: type,
          options,
          correctOptionIds,
          explanationText: explanation,
          points
        })
        .where(eq(schema.quizQuestions.id, existing.id));
      return existing;
    }

    const [inserted] = await db
      .insert(schema.quizQuestions)
      .values({
        quizId,
        questionText: text,
        questionType: type,
        options,
        correctOptionIds,
        explanationText: explanation,
        points,
        sequenceOrder
      })
      .returning();
    return inserted;
  }

  await seedQuizQuestion(
    practiceQuiz.id,
    1,
    'What is the average-case time complexity of retrieving a key in a well-distributed Hash Table?',
    'single_choice',
    [
      { id: 'opt-1a', text: 'O(1)' },
      { id: 'opt-1b', text: 'O(log N)' },
      { id: 'opt-1c', text: 'O(N)' },
      { id: 'opt-1d', text: 'O(N log N)' }
    ],
    ['opt-1a'],
    'Hash tables provide O(1) expected constant time lookups using direct hash indexing.'
  );

  await seedQuizQuestion(
    practiceQuiz.id,
    2,
    'Which of the following data structures are typically used to implement a Breadth-First Search (BFS)?',
    'single_choice',
    [
      { id: 'opt-2a', text: 'Queue (FIFO)' },
      { id: 'opt-2b', text: 'Stack (LIFO)' },
      { id: 'opt-2c', text: 'Min-Heap' },
      { id: 'opt-2d', text: 'Binary Search Tree' }
    ],
    ['opt-2a'],
    'BFS explores nodes level by level using a First-In-First-Out Queue.'
  );

  // B. Formal Timed Assessment
  const formalQuiz = await getOrCreateQuiz(
    formalQuizItem.id,
    'formal',
    30,
    70,
    'after_deadline'
  );

  await seedQuizQuestion(
    formalQuiz.id,
    1,
    'Which algorithm finds the shortest path from a single source in a weighted graph with non-negative edge weights?',
    'single_choice',
    [
      { id: 'fq-1a', text: "Dijkstra's Algorithm" },
      { id: 'fq-1b', text: 'Bellman-Ford Algorithm' },
      { id: 'fq-1c', text: 'Kruskal Algorithm' },
      { id: 'fq-1d', text: 'Floyd-Warshall Algorithm' }
    ],
    ['fq-1a'],
    "Dijkstra's algorithm greedily extracts the minimum distance node using a priority queue in O((V + E) log V) time."
  );

  await seedQuizQuestion(
    formalQuiz.id,
    2,
    'Which of the following statements about QuickSort are true? (Select all that apply)',
    'multiple_choice',
    [
      { id: 'fq-2a', text: 'Average time complexity is O(N log N).' },
      { id: 'fq-2b', text: 'Worst case time complexity occurs when the pivot partition is extremely unbalanced.' },
      { id: 'fq-2c', text: 'It requires O(N) auxiliary space in standard in-place implementations.' },
      { id: 'fq-2d', text: 'It is a stable sorting algorithm by default.' }
    ],
    ['fq-2a', 'fq-2b'],
    'QuickSort has O(N log N) average complexity and O(N²) worst-case when unbalanced. It is typically in-place (O(log N) stack) and unstable.'
  );

  // C. Log a passed attempt for Primary Student on Practice Quiz
  const [existingAttempt] = await db
    .select()
    .from(schema.quizAttempts)
    .where(
      and(
        eq(schema.quizAttempts.quizId, practiceQuiz.id),
        eq(schema.quizAttempts.studentId, primaryAccount.studentId)
      )
    )
    .limit(1);

  if (!existingAttempt) {
    await db.insert(schema.quizAttempts).values({
      quizId: practiceQuiz.id,
      studentId: primaryAccount.studentId,
      batchId: batch1.id,
      score: 2,
      maxScore: 2,
      isPassed: true,
      responses: { 1: ['opt-1a'], 2: ['opt-2a'] },
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000)
    });
  }

  console.log(`  ✓ Seeded Practice Quiz (2 questions) and Formal Timed Assessment (2 questions).`);

  // --------------------------------------------------------------------------
  // 8. PROJECTS & SUBMISSIONS (`assignments`, `assignment_submissions`)
  // --------------------------------------------------------------------------
  console.log('\n[8/12] Seeding Capstone Project & Approved Submission...');

  async function getOrCreateAssignment(contentItemId: string, rubricCriteria: unknown[], maxScore = 100) {
    const [existing] = await db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.contentItemId, contentItemId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.assignments)
        .set({ rubricCriteria, maxScore })
        .where(eq(schema.assignments.id, existing.id));
      return existing;
    }

    const [inserted] = await db
      .insert(schema.assignments)
      .values({ contentItemId, rubricCriteria, maxScore })
      .returning();
    return inserted;
  }

  const projectAssignment = await getOrCreateAssignment(
    projectItem.id,
    [
      { name: 'System Architecture & Clean Code', maxPoints: 30 },
      { name: 'Concurrency & Token Bucket Rate Limiting', maxPoints: 40 },
      { name: 'Automated Unit & Integration Tests', maxPoints: 30 }
    ],
    100
  );

  // Upsert submission for Primary Student
  const [existingSubmission] = await db
    .select()
    .from(schema.assignmentSubmissions)
    .where(
      and(
        eq(schema.assignmentSubmissions.assignmentId, projectAssignment.id),
        eq(schema.assignmentSubmissions.studentId, primaryAccount.studentId),
        eq(schema.assignmentSubmissions.batchId, batch1.id)
      )
    )
    .limit(1);

  if (existingSubmission) {
    await db
      .update(schema.assignmentSubmissions)
      .set({
        githubUrl: 'https://github.com/aarav-sharma-demo/distributed-url-shortener',
        liveUrl: 'https://url-shortener-demo.local',
        notes: 'Implemented Redis token bucket rate limiting and SHA-256 base62 encoding.',
        status: 'approved',
        score: 92,
        tutorFeedback: 'Exceptional rate-limiting implementation and clean separation of concerns.'
      })
      .where(eq(schema.assignmentSubmissions.id, existingSubmission.id));
  } else {
    await db.insert(schema.assignmentSubmissions).values({
      assignmentId: projectAssignment.id,
      studentId: primaryAccount.studentId,
      batchId: batch1.id,
      githubUrl: 'https://github.com/aarav-sharma-demo/distributed-url-shortener',
      liveUrl: 'https://url-shortener-demo.local',
      notes: 'Implemented Redis token bucket rate limiting and SHA-256 base62 encoding.',
      status: 'approved',
      score: 92,
      tutorFeedback: 'Exceptional rate-limiting implementation and clean separation of concerns.'
    });
  }

  console.log(`  ✓ Seeded Capstone Project Specification and Primary Student approved submission (Score: 92/100).`);

  // --------------------------------------------------------------------------
  // 9. DSA PROBLEM PROGRESS (`student_dsa_progress`)
  // --------------------------------------------------------------------------
  console.log('\n[9/12] Seeding Server-Authoritative DSA Problem Progress...');

  const completedDsaProblems = [
    { slug: 'two-sum', url: 'https://leetcode.com/problems/two-sum', notes: 'Single pass hash map lookup' },
    { slug: 'contains-duplicate', url: 'https://leetcode.com/problems/contains-duplicate', notes: 'Hash set uniqueness' },
    { slug: 'valid-anagram', url: 'https://leetcode.com/problems/valid-anagram', notes: 'Character frequency array' },
    { slug: 'binary-search', url: 'https://leetcode.com/problems/binary-search', notes: 'Classic two-pointer division' },
    { slug: 'reverse-linked-list', url: 'https://leetcode.com/problems/reverse-linked-list', notes: 'Iterative pointer rewiring' },
    { slug: 'maximum-depth-of-binary-tree', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree', notes: 'Recursive depth computation' }
  ];

  for (const prob of completedDsaProblems) {
    const [existing] = await db
      .select()
      .from(schema.studentDsaProgress)
      .where(
        and(
          eq(schema.studentDsaProgress.studentId, primaryAccount.studentId),
          eq(schema.studentDsaProgress.problemSlug, prob.slug)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.studentDsaProgress)
        .set({
          isCompleted: true,
          submissionUrl: prob.url,
          notes: prob.notes,
          completedAt: existing.completedAt || new Date()
        })
        .where(eq(schema.studentDsaProgress.id, existing.id));
    } else {
      await db.insert(schema.studentDsaProgress).values({
        studentId: primaryAccount.studentId,
        problemSlug: prob.slug,
        isCompleted: true,
        submissionUrl: prob.url,
        notes: prob.notes,
        completedAt: new Date()
      });
    }
  }

  console.log(`  ✓ Seeded 6 verified DSA problem completions across Arrays, Binary Search, Linked Lists, and Trees.`);

  // --------------------------------------------------------------------------
  // 10. ACTIVITY LEDGER & XP MOMENTUM (`activities`)
  // --------------------------------------------------------------------------
  console.log('\n[10/12] Seeding 30-Day Activity Ledger & Asia/Kolkata Streak Events...');

  async function seedActivityEvent(
    studentId: number,
    batchId: string,
    activityType: schema.ActivityTypeEnum,
    referenceId: string,
    xpAwarded: number,
    dateIst: string,
    createdAt: Date
  ) {
    const [existing] = await db
      .select()
      .from(schema.activities)
      .where(
        and(
          eq(schema.activities.studentId, studentId),
          eq(schema.activities.activityType, activityType),
          eq(schema.activities.referenceId, referenceId)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(schema.activities).values({
        studentId,
        batchId,
        activityType,
        referenceId,
        xpAwarded,
        activityDateIst: dateIst,
        createdAt
      });
    }
  }

  // A. Seed activities for Primary Student across consecutive days and 30-day window
  // Day 0 (today)
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'dsa_solved', 'two-sum', 50, getIstDate(0), new Date());
  // Day -1 (yesterday)
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'lecture_completed', lecture1.id, 25, getIstDate(-1), new Date(Date.now() - 1 * 24 * 60 * 60 * 1000));
  // Day -2
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'quiz_completed', practiceQuiz.id, 75, getIstDate(-2), new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
  // Day -3
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'dsa_solved', 'contains-duplicate', 50, getIstDate(-3), new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
  // Day -4
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'assignment_approved', projectAssignment.id, 200, getIstDate(-4), new Date(Date.now() - 4 * 24 * 60 * 60 * 1000));
  // Day -6
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'dsa_solved', 'valid-anagram', 50, getIstDate(-6), new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  // Day -8
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'dsa_solved', 'binary-search', 50, getIstDate(-8), new Date(Date.now() - 8 * 24 * 60 * 60 * 1000));
  // Day -12
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'external_assessment', 'EXT-AMCAT-ENG-2026', 150, getIstDate(-12), new Date(Date.now() - 12 * 24 * 60 * 60 * 1000));
  // Day -16
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'dsa_solved', 'reverse-linked-list', 50, getIstDate(-16), new Date(Date.now() - 16 * 24 * 60 * 60 * 1000));
  // Day -20
  await seedActivityEvent(primaryAccount.studentId, batch1.id, 'dsa_solved', 'maximum-depth-of-binary-tree', 50, getIstDate(-20), new Date(Date.now() - 20 * 24 * 60 * 60 * 1000));

  // B. Seed activities for Peer students (to populate weekly leaderboard rankings)
  await seedActivityEvent(peer1.studentId, batch1.id, 'dsa_solved', 'peer-dsa-1', 50, getIstDate(0), new Date());
  await seedActivityEvent(topper.studentId, batch1.id, 'dsa_solved', 'topper-dsa-1', 100, getIstDate(0), new Date());
  await seedActivityEvent(topper.studentId, batch1.id, 'assignment_approved', 'topper-project-1', 250, getIstDate(-1), new Date(Date.now() - 1 * 24 * 60 * 60 * 1000));

  console.log(`  ✓ Seeded chronological learning activities across 5 consecutive days and 30-day heatmap window.`);

  // --------------------------------------------------------------------------
  // 11. EXTERNAL BENCHMARK REPORT CARDS (`external_assessment_records`)
  // --------------------------------------------------------------------------
  console.log('\n[11/12] Seeding External Assessment Benchmarks...');

  async function seedExternalAssessment(
    studentId: number,
    batchId: string,
    code: string,
    name: string,
    provider: string,
    maxScore: number,
    obtainedScore: number,
    percentile: number
  ) {
    const [existing] = await db
      .select()
      .from(schema.externalAssessmentRecords)
      .where(
        and(
          eq(schema.externalAssessmentRecords.studentId, studentId),
          eq(schema.externalAssessmentRecords.batchId, batchId),
          eq(schema.externalAssessmentRecords.assessmentCode, code)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.externalAssessmentRecords)
        .set({
          assessmentName: name,
          provider,
          maxScore,
          obtainedScore,
          percentile
        })
        .where(eq(schema.externalAssessmentRecords.id, existing.id));
    } else {
      await db.insert(schema.externalAssessmentRecords).values({
        studentId,
        batchId,
        assessmentCode: code,
        assessmentName: name,
        provider,
        maxScore,
        obtainedScore,
        percentile
      });
    }
  }

  await seedExternalAssessment(
    primaryAccount.studentId,
    batch1.id,
    'EXT-AMCAT-ENG-2026',
    'Aspiring Minds Computer Programming Benchmark',
    'SHL / AMCAT',
    800,
    720,
    92
  );

  await seedExternalAssessment(
    primaryAccount.studentId,
    batch1.id,
    'EXT-COCUBES-PRE-2026',
    'CoCubes Pre-Employability Technical Index',
    'Aon CoCubes',
    100,
    78,
    81
  );

  console.log(`  ✓ Seeded 2 standardized benchmarks (AMCAT Elite Tier 92nd %, CoCubes Advanced Tier 81st %).`);

  // --------------------------------------------------------------------------
  // 12. NOTIFICATION FEED (`notifications`)
  // --------------------------------------------------------------------------
  console.log('\n[12/12] Seeding Student Notification Center Feed...');

  async function seedNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    actionUrl: string,
    isRead: boolean
  ) {
    const [existing] = await db
      .select()
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.title, title)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.notifications)
        .set({ body, actionUrl, isRead })
        .where(eq(schema.notifications.id, existing.id));
    } else {
      await db.insert(schema.notifications).values({
        userId,
        type,
        title,
        body,
        actionUrl,
        isRead
      });
    }
  }

  await seedNotification(
    primaryAccount.userId,
    'PROJECT_REVIEWED',
    'Capstone Project Approved',
    'Your submission for High-Performance URL Shortener was approved with 92/100 points.',
    '/assessments',
    false // unread
  );

  await seedNotification(
    primaryAccount.userId,
    'ASSESSMENT_DUE_SOON',
    'Midterm Assessment Upcoming',
    'Midterm Formal Timed Assessment is scheduled. Prepare your environment before the deadline.',
    '/assessments',
    false // unread
  );

  await seedNotification(
    primaryAccount.userId,
    'STREAK_MILESTONE',
    '5-Day Streak Unlocked! 🔥',
    'You maintained learning momentum for 5 consecutive calendar days in Asia/Kolkata IST.',
    '/overview',
    true // read
  );

  await seedNotification(
    primaryAccount.userId,
    'MILESTONE_UNLOCKED',
    'Week 4 Curriculum Unlocked',
    'Core Algorithms and Timed Assessments are now accessible in your Alpha Cohort workspace.',
    '/batches',
    true // read
  );

  await seedNotification(
    primaryAccount.userId,
    'STUDENT_ACTIVATED',
    'Welcome to RMS Careers',
    'Your institutional student account has been successfully verified and activated.',
    '/overview',
    true // read
  );

  console.log(`  ✓ Seeded 5 domain notifications (2 unread, 3 read) for Primary Student.`);

  // ==========================================================================
  // SUMMARY & TEST CREDENTIALS
  // ==========================================================================
  console.log('\n=================================================================');
  console.log('             DEMO SEEDING COMPLETED SUCCESSFULLY                 ');
  console.log('=================================================================');
  console.log('\nPRIMARY DEMO TEST CREDENTIALS:');
  console.log(`  Portal URL:  http://localhost:3002/login (or student.rms-careers.com)`);
  console.log(`  Email:       ${PRIMARY_DEMO_STUDENT.email}`);
  console.log(`  Password:    ${DEMO_PASSWORD}`);
  console.log(`  Cohort:      ${batch1.name} (ID: ${batch1.id})`);
  console.log(`  Institution: ${college1.name}`);
  console.log(`  Status:      Active Enrolled Student`);
  console.log('\nAUTHORIZATION ISOLATION TEST ACCOUNTS (Same password):');
  console.log(`  Peer in Batch 1:     peer.demo@rms-careers.local`);
  console.log(`  Batch 1 Topper (#1): topper.demo@rms-careers.local`);
  console.log(`  Peer in Batch 2:     beta.demo@rms-careers.local`);
  console.log(`  College 2 Student:   external.demo@rms-careers.local`);
  console.log('=================================================================\n');
}

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('seed-student.ts') || process.argv[1].endsWith('seed-student.js'));

if (isDirectExecution) {
  runStudentSeeder()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n[FATAL ERROR] Student demo seeding failed:');
      console.error(err);
      process.exit(1);
    });
}
