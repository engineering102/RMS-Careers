/**
 * RMS Careers Homepage Content Slot Definitions
 * 
 * Separates layout and presentation structure from content and data.
 * All marketing copy, headlines, descriptions, CTAs, pillars, roadmaps,
 * and institutional propositions can be replaced here without modifying component layouts.
 */

export interface CtaButton {
  label: string;
  href: string;
  isExternal?: boolean;
}

// -------------------------------------------------------------
// 01. ANNOUNCEMENT BAR
// -------------------------------------------------------------
export const announcementContent = {
  enabled: true,
  badge: 'Academic Year 2026',
  headline: 'Institutional Partnership Cohorts & Placement Readiness Programs Now Enrolling',
  ctaLabel: 'Partner With RMS',
  ctaHref: '#partner'
};

// -------------------------------------------------------------
// 02. HERO SECTION
// -------------------------------------------------------------
export const heroContent = {
  eyebrow: 'Institutional Career-Readiness Partner',
  headlinePrefix: 'Your Degree Gets You Started.',
  headlineHighlight: 'Your Skills Get You Hired.',
  description:
    'RMS Careers works with engineering colleges to bridge the gap between academic learning and industry expectations through structured technical training, practical projects, career preparation and continuous mentorship.',
  primaryCta: {
    label: 'Partner With RMS →',
    href: '#partner'
  },
  secondaryCta: {
    label: 'Explore Our Approach →',
    href: '#approach'
  },
  proofPoints: [
    'B.Tech Across Branches & Years',
    'Live Mentorship & Code Reviews',
    'Institutional College Partnerships'
  ],
  systemVisual: {
    journeyLabel: '6-Month Career-Readiness Journey',
    tagline: 'Continuous Guidance from Foundations to Industry Placement',
    stages: [
      { id: '01', title: 'Career Foundations', tag: 'Orientation' },
      { id: '02', title: 'Technical Development', tag: 'Core Skills' },
      { id: '03', title: 'Projects & Portfolio', tag: 'Engineering' },
      { id: '04', title: 'Career Readiness', tag: 'Preparation' },
      { id: '05', title: 'Career Launch', tag: 'Placement' }
    ],
    supportingPillars: [
      'Live Classes',
      'Assignments',
      'Project Work',
      'Mentorship',
      'Career Prep'
    ]
  },
  // Retained for test backward compatibility
  codeSnippet: {
    filename: 'PatternEngine.ts',
    pattern: 'Algorithmic Invariant & Time Complexity',
    language: 'typescript',
    code: `// Pattern: Two-Pointer Convergence (O(n) time, O(1) space)
export function maxWaterArea(heights: number[]): number {
  let left = 0, right = heights.length - 1;
  let maxArea = 0;
  while (left < right) {
    const width = right - left;
    const minH = Math.min(heights[left], heights[right]);
    maxArea = Math.max(maxArea, width * minH);
    if (heights[left] < heights[right]) left++;
    else right--;
  }
  return maxArea;
}`
  },
  educatorCard: {
    badge: 'Classroom Tested',
    title: 'Live Teaching & Mentorship',
    role: 'Industry Practitioners & Lead Educators',
    note: 'Shaped by firsthand experience teaching engineering undergraduates'
  }
};

// -------------------------------------------------------------
// SECTION 2: THE GAP
// -------------------------------------------------------------
export const gapContent = {
  eyebrow: 'The Institutional Reality',
  headline: "The gap isn't the curriculum. It's what comes after it.",
  narrative:
    'Engineering colleges provide students with strong academic foundations. But career readiness requires what standard syllabi cannot deliver alone: practical coding intuition, multi-tier projects, interview conditioning, and continuous mentorship.',
  academicFoundation: {
    title: 'Academic Foundation',
    subtitle: 'What Colleges Successfully Provide',
    items: [
      'Accredited University Syllabus',
      'Semester Examinations & GPA',
      'Foundational Theory & Mathematics',
      'Standard Laboratory Practicals'
    ]
  },
  theGap: {
    title: 'The Readiness Gap',
    subtitle: 'What Industry Hiring Evaluates',
    items: [
      'Pattern-Based Problem Solving & DSA',
      'Production-Grade Collaborative Projects',
      'ATS-Optimized Resumes & Portfolio Defenses',
      '1-on-1 Technical Mock Interview Drills',
      'Continuous Practitioner Mentorship'
    ]
  },
  careerReadiness: {
    title: 'Career Readiness',
    subtitle: 'The Realized RMS Outcome',
    items: [
      'Verifiable Engineering Portfolios',
      'Placement Drive Confidence & Poise',
      'Work-Ready Problem Solving Intuition'
    ]
  }
};

// -------------------------------------------------------------
// SECTION 3: THE RMS APPROACH & FIVE-STAGE FRAMEWORK
// -------------------------------------------------------------
export const approachContent = {
  eyebrow: 'Six-Month Structured Framework',
  headline: 'One journey. From academic foundation to career readiness.',
  description:
    'RMS stays with students throughout the approximately six-month engagement rather than delivering disconnected one-off workshops. We combine live learning, assignments, project work, career preparation, and continuous guidance.',
  journeyDuration: '6-Month Continuous Engagement',
  scopeNote: 'The five stages operate across the six-month journey.',
  stages: [
    {
      id: '01',
      code: '01',
      title: 'Career Foundations',
      phase: 'Orientation & Roadmaps',
      description:
        'Establishing technical clarity, programming discipline, and structured roadmaps from day one.',
      topics: [
        'Career awareness',
        'Programming fundamentals',
        'Learning roadmaps',
        'Basic professional skills'
      ]
    },
    {
      id: '02',
      code: '02',
      title: 'Technical Development',
      phase: 'Core Problem Solving',
      description:
        'Pattern-first problem solving, complexity analysis, and modern language fluency.',
      topics: [
        'Python / Java',
        'DSA',
        'Core CS',
        'Development',
        'Git / GitHub'
      ]
    },
    {
      id: '03',
      code: '03',
      title: 'Projects & Portfolio',
      phase: 'Production Engineering',
      description:
        'Engineering multi-tier applications with collaborative Git workflows and relational schemas.',
      topics: [
        'Real-world projects',
        'GitHub',
        'Portfolios',
        'Project presentation'
      ]
    },
    {
      id: '04',
      code: '04',
      title: 'Career Readiness',
      phase: 'Professional Conditioning',
      description:
        'ATS-optimized resumes, quantitative aptitude training, and rigorous 1-on-1 mock interviews.',
      topics: [
        'Resume',
        'LinkedIn',
        'Communication',
        'Aptitude',
        'Mock interviews'
      ]
    },
    {
      id: '05',
      code: '05',
      title: 'Career Launch',
      phase: 'Placement Execution',
      description:
        'Targeted company preparation sheets, interview assistance, and placement drive execution.',
      topics: [
        'Job discovery',
        'Applications',
        'Company preparation',
        'Interviews',
        'Placement assistance'
      ]
    }
  ]
};

// -------------------------------------------------------------
// SECTION 4: SIX-MONTH DELIVERY MODEL
// -------------------------------------------------------------
export const deliveryModelContent = {
  eyebrow: 'Delivery Architecture',
  headline: 'Six months of continuous guidance. Not a one-off workshop.',
  description:
    'Students stay connected with RMS throughout the journey through live classes, assignments, project work and ongoing career guidance.',
  pillars: [
    {
      title: 'Live Classes',
      detail: 'Interactive technical instruction led by software engineering practitioners.'
    },
    {
      title: 'Assignments',
      detail: 'Regular coding tasks reinforcing pattern intuition and clean implementation.'
    },
    {
      title: 'Project Work',
      detail: 'Real GitHub repositories, relational schemas, and modular full-stack capstones.'
    },
    {
      title: 'Mentorship',
      detail: 'Continuous doubt clearing, live code review audits, and cohort milestones.'
    },
    {
      title: 'Career Preparation',
      detail: 'Resume reviews, quantitative aptitude, and simulated technical interviews.'
    }
  ],
  deliveryModes: [
    {
      mode: 'Online',
      badge: 'Primary Format',
      isPrimary: true,
      description: 'Delivered via interactive live virtual classrooms, collaborative labs, and continuous remote mentorship.'
    },
    {
      mode: 'Offline',
      badge: 'On-Campus',
      isPrimary: false,
      description: 'Intensive on-campus classroom sessions, weekend bootcamps, and faculty coordination.'
    },
    {
      mode: 'Hybrid',
      badge: 'Blended',
      isPrimary: false,
      description: 'Structured blend combining regular online live learning with scheduled on-campus reviews.'
    }
  ]
};

// -------------------------------------------------------------
// SECTION 5: WHAT STUDENTS EXPERIENCE
// -------------------------------------------------------------
export const studentExperienceContent = {
  eyebrow: 'Student Perspective',
  headline: 'What Students Experience',
  description:
    'A structured day-to-day progression designed to build verifiable capability alongside college academics.',
  steps: [
    {
      step: '01',
      title: 'Learn',
      summary: 'Live technical sessions and structured learning.'
    },
    {
      step: '02',
      title: 'Practice',
      summary: 'Assignments and continuous problem-solving.'
    },
    {
      step: '03',
      title: 'Build',
      summary: 'Real-world projects and GitHub portfolios.'
    },
    {
      step: '04',
      title: 'Prepare',
      summary: 'Resume, communication, aptitude and interview preparation.'
    },
    {
      step: '05',
      title: 'Get Guided',
      summary: 'Continuous mentorship throughout the journey.'
    }
  ],
  progressFeature: {
    headline: 'Progress students can see.',
    description: 'XP, daily coding streaks, verified milestone badges, and cohort leaderboards keep learners motivated and consistent.',
    disclaimer: 'Gamified progress tracking is available to enrolled cohort students on the authenticated Student Portal.'
  }
};

// -------------------------------------------------------------
// SECTION 6: BUILT FROM REAL CLASSROOM EXPERIENCE
// -------------------------------------------------------------
export const classroomExperienceContent = {
  eyebrow: 'Origin & Philosophy',
  headline: 'Built from real classrooms. Designed for real careers.',
  narrative: [
    'RMS Careers was founded inside engineering college classrooms. Over semesters of direct interaction with B.Tech students across disciplines, we observed firsthand the persistent gap between academic theory and what hiring engineering teams actually evaluate.',
    'We designed RMS to be the partner colleges need: staying with students over six months to turn academic potential into practical capability through structured learning, hands-on projects, and disciplined placement preparation.'
  ],
  storyPoints: [
    'Founded through direct classroom teaching with engineering undergraduates',
    'Aligned with the exact criteria evaluated in industry technical interviews',
    'Integrated seamlessly with college schedules without faculty disruption'
  ],
  photoSlot: {
    label: 'Classroom & Workshop Photography',
    caption: 'Direct teaching and code review sessions at partner engineering colleges (Replaceable Photo Frame)'
  }
};

// -------------------------------------------------------------
// SECTION 7: RMS IN ACTION (Asymmetric Gallery)
// -------------------------------------------------------------
export const rmsInActionContent = {
  eyebrow: 'Visual Activity',
  headline: 'RMS in Action',
  description: 'Moments from classrooms, interactive coding workshops, and mentor review sessions.',
  gallery: [
    {
      id: '01',
      category: 'Teaching',
      title: 'Classroom Concept Breakdown',
      caption: 'Decomposing complex algorithmic patterns into intuitive invariants.',
      aspect: 'featured'
    },
    {
      id: '02',
      category: 'Workshops',
      title: 'Campus Placement Sprints',
      caption: 'Intensive weekend bootcamps breaking down hiring expectations.',
      aspect: 'supporting'
    },
    {
      id: '03',
      category: 'Code Reviews',
      title: 'Architecture & Logic Audits',
      caption: 'Live line-by-line feedback on clean modular code.',
      aspect: 'supporting'
    },
    {
      id: '04',
      category: 'Projects',
      title: 'Collaborative Capstone Engineering',
      caption: 'Student teams building modular full-stack projects using Git.',
      aspect: 'wide'
    }
  ]
};

// -------------------------------------------------------------
// SECTION 8: PARTNER WITH RMS (Institutional Enquiry Form)
// -------------------------------------------------------------
export const partnerEnquiryContent = {
  eyebrow: 'Institutional Engagement',
  headline: "Let's build a stronger career-readiness journey for your students.",
  description:
    'Tell us about your institution and what you are looking to achieve. Our team will get in touch to understand your requirements and explore how RMS can work with your college.',
  formConfig: {
    institutionTypes: [
      'Engineering College / University',
      'Autonomous Engineering Institute',
      'Deemed University',
      'Technical Institute',
      'Other Academic Body'
    ],
    studentStrengthOptions: [
      'Under 200 Students',
      '200 – 500 Students',
      '500 – 1,000 Students',
      '1,000+ Students'
    ],
    partnershipObjectives: [
      'Technical Development',
      'Project Development',
      'Career Preparation',
      'Job Preparation',
      'Mentorship / Live Sessions',
      'Other'
    ],
    timelineOptions: [
      'Immediately',
      'Within 1 month',
      'Within 3 months',
      'Within 6 months',
      'Next academic year',
      'Just exploring'
    ]
  }
};

// Backward-compatibility aliases for legacy exports
export const whatIsRmsContent = {
  eyebrow: 'The Career-Readiness Ecosystem',
  headline: 'What Exactly is RMS Careers?',
  description: 'RMS Careers bridges the gap between academic education and practical career readiness through structured technical training, practical projects, and continuous mentorship.',
  pillars: [
    { title: 'Academic Theory to Practical Capability', description: 'Equipping B.Tech students with algorithmic intuition and coding standards.' },
    { title: 'College-Led Institutional Partnership', description: 'Partnering directly with colleges through formal MoUs.' },
    { title: 'Continuous Mentorship & Verifiable Progress', description: 'Experienced software practitioners conducting live reviews and mock interviews.' }
  ],
  cta: { label: 'Explore About RMS →', href: '#built-from-experience' }
};

export const whatWeOfferContent = {
  eyebrow: 'Comprehensive Breadth',
  headline: 'Four Focus Areas of Career Readiness',
  description: approachContent.description,
  areas: [
    { id: '01', title: 'Technical Learning', badge: 'Core Problem Solving', summary: 'Pattern-first algorithmic training across data structures.', highlights: ['15 Algorithmic Patterns', 'Data Structures & Algorithms', 'Complexity Analysis'], href: '/programs' },
    { id: '02', title: 'Practical Projects', badge: 'Production Engineering', summary: 'Multi-tier applications built using Git workflows.', highlights: ['Full-Stack Web Architectures', 'Git Collaboration', 'Relational Schemas'], href: '/programs' },
    { id: '03', title: 'Career Preparation', badge: 'Professional Polish', summary: 'Interview conditioning covering resumes and aptitude.', highlights: ['ATS Resumes', 'Quantitative Aptitude', 'Communication'], href: '/programs' },
    { id: '04', title: 'Mentorship & Guidance', badge: 'Practitioner Coaching', summary: 'Live guidance from tutors and mock interviews.', highlights: ['Live Code Reviews', '1-on-1 Mock Interviews', 'Cohort Milestones'], href: '/programs' }
  ],
  note: 'Operates across the six-month journey.'
};

export const builtFromExperienceContent = {
  eyebrow: classroomExperienceContent.eyebrow,
  headline: 'Built From Real Classroom Experience.',
  description: 'RMS Careers was founded inside engineering college classrooms, observing the gap between textbook theory and what hiring engineering teams actually evaluate.',
  principles: [
    { title: 'Intuition Over Rote Memorization', description: 'Master transferable patterns.' },
    { title: 'Production-Grade Standards', description: 'Real-world software architectures.' },
    { title: 'Institutional Accountability', description: 'Direct partnership with college leadership.' }
  ],
  placeholderNote: {
    title: 'Classroom & Workshop Visual Slot',
    subtitle: classroomExperienceContent.photoSlot.caption,
    tag: 'Replaceable Visual Frame'
  },
  cta: { label: 'Explore Our Story →', href: '#approach' }
};

export const inActionContent = {
  eyebrow: rmsInActionContent.eyebrow,
  headline: rmsInActionContent.headline,
  description: rmsInActionContent.description,
  categories: rmsInActionContent.gallery
};

export const audienceSplitContent = {
  eyebrow: 'Institutional & Student Engagement',
  headline: 'Two Journeys, One Mission',
  description: 'Whether you are a college leader seeking cohort training or a student building practical skills, RMS provides structured pathways.',
  students: {
    badge: 'For Students',
    title: 'Practical Technical Readiness',
    message: 'Build skills, projects and career confidence.',
    description: 'Master algorithmic problem solving, collaborative Git workflows, and interview preparation.',
    highlights: [
      'Pattern-based DSA problem solving',
      'Production-grade capstone projects',
      '1-on-1 mock technical interviews'
    ],
    cta: { label: 'Explore Student Experience', href: '/learn' },
    footnote: 'Public Starter Sheets 100% Free'
  },
  institutions: {
    badge: 'For Engineering Colleges',
    title: 'Structured Cohort Delivery',
    message: 'Bring structured career readiness to students through institutional partnership.',
    description: 'Partner directly with RMS to deliver structured career readiness to your student batches.',
    highlights: [
      'MoU-based cohort delivery tailored to your academic calendar',
      'Experienced software engineering practitioner instruction',
      'Transparent batch engagement and readiness tracking'
    ],
    cta: { label: 'Partner With RMS', href: '#final-cta' },
    footnote: 'College-Led Institutional Partnership Model'
  }
};

export const rewardsTeaserContent = {
  eyebrow: 'Gamified Progress',
  headline: 'Progress students can see.',
  subhead: 'Continuous Motivation & Cohort Accountability',
  description: studentExperienceContent.progressFeature.description,
  features: [
    { title: 'Experience Points (XP)', badge: 'Effort Tracking', desc: 'Earn XP for every verified code implementation, assignment, and lecture attended.' },
    { title: 'Daily Practice Streaks', badge: 'Consistency', desc: 'Build daily engineering habits with continuous coding streak tracking.' },
    { title: 'Milestone Badges', badge: 'Achievement', desc: 'Unlock verified pattern badges as you master algorithmic invariant concepts.' },
    { title: 'Campus Leaderboards', badge: 'Peer Motivation', desc: 'Compare your progress within your college batch and across cohort institutions.' }
  ],
  disclaimer: 'Gamified progress tracking, XP, and leaderboards are available exclusively to enrolled cohort students on the authenticated Student Portal.',
  link: { label: 'Explore Student Experience', href: '/learn' }
};

export const finalCtaContent = {
  badge: partnerEnquiryContent.eyebrow,
  headline: partnerEnquiryContent.headline,
  description: partnerEnquiryContent.description,
  studentCta: { label: 'Explore Student Experience', href: '/learn' },
  institutionCta: { label: 'Partner With RMS', href: 'mailto:partnerships@rms-careers.com' },
  primaryCta: { label: 'Partner With RMS →', href: '#partner' },
  secondaryCta: { label: 'Explore Our Approach →', href: '#approach' },
  footnote: 'College-Led Institutional Partnership Model • Online · Offline · Hybrid'
};

// -------------------------------------------------------------
// 03. TRUST STRIP
// -------------------------------------------------------------
export const trustStripContent = [
  { label: 'B.Tech Specialization', detail: 'Designed for engineering students across branches & years' },
  { label: 'Live Interactive Learning', detail: 'Hands-on classroom workshops, live coding & Q&A' },
  { label: 'Practitioner Mentorship', detail: 'Direct guidance from experienced software professionals' },
  { label: 'Production Projects', detail: 'Real Git repositories, relational schemas & clean architectures' },
  { label: 'Holistic Career Prep', detail: 'Technical mock interviews, aptitude training & resume reviews' }
];

// -------------------------------------------------------------
// 04. CORE BRAND JOURNEY (LEARN → BUILD → PREPARE → LAUNCH)
// -------------------------------------------------------------
export const coreJourneyContent = {
  eyebrow: 'Canonical Brand Journey',
  headline: 'Learn → Build → Prepare → Launch',
  description:
    'A structured, four-phase transformation taking engineering students from foundational concepts to enterprise placement readiness.',
  stages: [
    {
      step: '01',
      phase: 'LEARN',
      title: 'Master Technical Foundations',
      description:
        'Build deep problem-solving skills across data structures, algorithms, programming paradigms, and computer science core principles.',
      badge: 'Pattern-First'
    },
    {
      step: '02',
      phase: 'BUILD',
      title: 'Engineer Practical Projects',
      description:
        'Apply theoretical knowledge into multi-tier applications, Git collaboration, relational database modeling, and clean code architectures.',
      badge: 'Production-Grade'
    },
    {
      step: '03',
      phase: 'PREPARE',
      title: 'Hone Career & Job Readiness',
      description:
        'Master mock technical interviews, aptitude assessments, resume optimization, and targeted company preparation.',
      badge: 'Interview-Ready'
    },
    {
      step: '04',
      phase: 'LAUNCH',
      title: 'Enter the Industry Confidently',
      description:
        'Participate in institutional placement drives and enterprise opportunities with verified competence and a production portfolio.',
      badge: 'Placement Success'
    }
  ]
};

// -------------------------------------------------------------
// 05. FOUNDER & EDUCATOR CREDIBILITY
// -------------------------------------------------------------
export const founderContent = {
  eyebrow: 'Pedagogical Philosophy',
  headline: 'Built From Real Classroom Experience.',
  subhead: 'Observing the gap between academic textbooks and what hiring engineering teams actually evaluate.',
  narrative: [
    'RMS Careers was founded inside engineering college classrooms. Over semesters of direct interaction with B.Tech students across disciplines, one consistent reality emerged: students have immense potential, but standard curricula often emphasize memorization over algorithmic intuition and production engineering.',
    'We built RMS Careers to provide the structured mentorship, hands-on project engineering, and systematic placement preparation that textbooks cannot offer alone.',
    'Our commitment is unwavering: no superficial guarantees, no gimmicks. Only rigorous, structured learning that delivers genuine career confidence.'
  ],
  principles: [
    {
      title: 'Intuition Over Rote Memorization',
      description: 'Master transferable patterns instead of memorizing hundreds of disconnected interview problems.'
    },
    {
      title: 'Production-Grade Code Standards',
      description: 'Every project is structured with version control, modularity, relational databases, and clean architecture.'
    },
    {
      title: 'Institutional Accountability',
      description: 'We partner directly with college leadership to provide cohort analytics and verifiable student progression.'
    }
  ],
  signature: {
    name: 'Academic & Technical Leadership',
    title: 'RMS Careers (Rising Minds Solutions)',
    location: 'Hyderabad, India'
  }
};

// -------------------------------------------------------------
// 06. SIX CANONICAL SERVICE PILLARS
// -------------------------------------------------------------
export const servicePillarsContent = {
  eyebrow: 'Integrated Ecosystem',
  headline: 'Six Pillars of Career Readiness',
  description:
    'RMS Careers does not sell disconnected courses. We provide an integrated technical preparation ecosystem designed specifically for engineering undergraduates.',
  pillars: [
    {
      id: '01',
      title: 'Technical Skills',
      tag: 'Core Foundation',
      description:
        'Structured, pattern-oriented training in modern languages, algorithms, data structures, and core software engineering fundamentals.',
      topics: ['Python & Java', 'DSA & Complexity Analysis', 'Web Development (MERN)', 'DBMS & SQL', 'Testing & QA', 'SAP Introduction'],
      highlights: ['15 Algorithmic Patterns', 'Live Code Walkthroughs', 'Multi-Language Solutions']
    },
    {
      id: '02',
      title: 'Projects & Portfolio',
      tag: 'Practical Engineering',
      description:
        'Transform theoretical knowledge into verifiable code repositories, collaborative Git workflows, and production capstone projects.',
      topics: ['Full-Stack Web Architectures', 'Git & GitHub Collaboration', 'Relational Schema Design', 'System Modularity', 'Live Deployment'],
      highlights: ['Portfolio Review', 'Code Review Audits', 'Architecture Defense']
    },
    {
      id: '03',
      title: 'Career Preparation',
      tag: 'Professional Polish',
      description:
        'Comprehensive professional conditioning covering modern technical resumes, LinkedIn positioning, communication skills, and quantitative aptitude.',
      topics: ['ATS-Compliant Technical Resumes', 'LinkedIn Presence Optimization', 'Professional Communication', 'Quantitative Aptitude', 'Verbal & Reasoning'],
      highlights: ['Resume Critique', 'Aptitude Question Banks', 'Confidence Workshops']
    },
    {
      id: '04',
      title: 'Job Preparation',
      tag: 'Interview Execution',
      description:
        'Structured company-specific preparation tracks, technical mock interview simulations, problem-solving under time limits, and placement assistance.',
      topics: ['Company-Wise Question Archives', '1-on-1 Mock Technical Interviews', 'System Design Fundamentals', 'HR & Behavioral Scenarios', 'Placement Assistance'],
      highlights: ['Live Mock Feedback', 'Curated Company Sheets', 'Placement Readiness']
    },
    {
      id: '05',
      title: 'Curated Resources',
      tag: 'Knowledge Base',
      description:
        'High-yield reference materials, lecture slides, cheatsheets, curated DSA roadmaps, and revision kits available to enrolled cohorts.',
      topics: ['Lecture Slide Decks', 'Topic Revision Guides', 'High-Yield DSA Roadmaps', 'Interview Cheatsheets', 'Practice Question Sets'],
      highlights: ['Digital Library Access', 'Offline Reading Notes', 'Continually Updated']
    },
    {
      id: '06',
      title: 'Personalized Guidance',
      tag: 'Mentorship & Support',
      description:
        'Dedicated tutor mentorship, live doubt-clearing sessions, progress tracking dashboards, and cohort accountability.',
      topics: ['Dedicated Tutor Mentors', 'Interactive Q&A Sessions', 'Progress Tracking Dashboard', 'Cohort Community Access', 'Individual Milestone Reviews'],
      highlights: ['Direct Tutor Contact', 'Batch Progress Tracking', 'Peer Community']
    }
  ]
};

// -------------------------------------------------------------
// 07. 1-MONTH CAREER READINESS PROGRAM
// -------------------------------------------------------------
export const careerReadinessContent = {
  eyebrow: 'Flagship Institutional Offering',
  headline: '1-Month Career Readiness Program',
  subhead: "Build the skills. Build the confidence. Prepare for what's next.",
  description:
    'An intensive, cohort-based curriculum delivered in collaboration with partner engineering colleges. Designed to rapidly elevate student technical competence and interview readiness.',
  components: [
    { title: 'Technical Skills', desc: 'Accelerated problem-solving & algorithmic foundations' },
    { title: 'Projects & Portfolio', desc: 'Real-world capstone development with Git version control' },
    { title: 'Career Preparation', desc: 'Technical resume crafting & aptitude workshops' },
    { title: 'Job Preparation', desc: 'Targeted company interview drills & mock evaluations' },
    { title: 'Curated Resources', desc: 'Complete library of slides, sheets & revision notes' },
    { title: 'Personalized Guidance', desc: 'Live tutor reviews, doubt resolution & progress tracking' }
  ],
  commercialNote:
    'Delivered directly to college batches through institutional partnership and MoU. Tailored to department curricula and semester placement schedules.',
  cta: {
    label: 'Partner With RMS for Your College',
    href: '#partner'
  }
};

// -------------------------------------------------------------
// 08. PROGRAM JOURNEY (HOW THE 1-MONTH PROGRAM UNFOLDS)
// -------------------------------------------------------------
export const programJourneyContent = {
  eyebrow: 'Cohort Roadmap',
  headline: 'How the 1-Month Program Unfolds',
  description:
    'A structured, four-week progression taking student batches from initial technical diagnostics to final mock interview evaluations.',
  weeks: [
    {
      week: 'Week 1',
      title: 'Technical Diagnostics & Core Foundations',
      focus: 'Algorithmic patterns, complexity analysis, and programming core language review.',
      milestone: 'Baseline diagnostic assessment & pattern roadmap.'
    },
    {
      week: 'Week 2',
      title: 'Project Architecture & Practical Implementation',
      focus: 'Hands-on full-stack development, database schema modeling, and Git collaboration.',
      milestone: 'Functional project repository with modular architecture.'
    },
    {
      week: 'Week 3',
      title: 'Portfolio Optimization & Aptitude Readiness',
      focus: 'Technical resume building, quantitative & logical aptitude problem-solving.',
      milestone: 'Polished ATS resume & aptitude benchmark test.'
    },
    {
      week: 'Week 4',
      title: 'Mock Technical Interviews & Placement Drills',
      focus: 'Live 1-on-1 mock interviews, company-specific question sets, and personalized feedback.',
      milestone: 'Comprehensive readiness scorecard & placement roadmap.'
    }
  ]
};



// -------------------------------------------------------------
// 10. STUDENT BENEFITS
// -------------------------------------------------------------
export const studentBenefitsContent = {
  eyebrow: 'For Engineering Students',
  headline: 'Everything You Need to Stand Out',
  description:
    'Move beyond theoretical exams. Build the practical problem-solving ability, hands-on engineering experience, and interview confidence required by top employers.',
  benefits: [
    {
      title: 'Pattern-Based Problem Solving',
      desc: 'Stop memorizing problems. Learn transferable algorithmic patterns that apply to any technical challenge.'
    },
    {
      title: 'Portfolio-Grade Capstone Projects',
      desc: 'Build real-world software applications you can confidently demonstrate and defend during interviews.'
    },
    {
      title: 'Continuous Mentor Feedback',
      desc: 'Get actionable code reviews and guidance from software engineering tutors who know industry standards.'
    },
    {
      title: 'Targeted Placement Preparation',
      desc: 'Practice mock technical interviews, aptitude assessments, and company-specific question sets.'
    }
  ],
  distinction: {
    guestTitle: 'Explore Freely as a Guest',
    guestDesc: 'Access free starter DSA sheets, algorithmic pattern guides, and public curriculum tracks right now with zero login required.',
    enrolledTitle: 'Enroll Through Your College',
    enrolledDesc: 'Get full access to the authenticated Student Portal with dedicated batch mentorship, verified assignments, XP, streaks, and institutional leaderboards.'
  },
  cta: {
    label: 'Start Learning as a Guest',
    href: '/learn'
  }
};

// -------------------------------------------------------------
// 11. INSTITUTION BENEFITS
// -------------------------------------------------------------
export const institutionBenefitsContent = {
  eyebrow: 'For Colleges & Institutional Leadership',
  headline: 'Elevate Campus Placement Outcomes',
  description:
    'Partner with RMS Careers to deliver standardized, high-impact technical career training across student batches, without overburdening existing faculty.',
  benefits: [
    {
      title: 'Structured Industry-Aligned Curriculum',
      desc: 'Curricula engineered to bridge college academic programs with active hiring standards in tech.'
    },
    {
      title: 'Dedicated Tutor Mentorship',
      desc: 'Experienced instructors handle live coding sessions, assignments, doubt clearing, and mock interviews.'
    },
    {
      title: 'Transparent Cohort Analytics',
      desc: 'Real-time visibility into batch attendance, problem-solving progress, and student readiness metrics.'
    },
    {
      title: 'Measurable Placement Enhancement',
      desc: 'Students enter campus placement drives with stronger problem-solving skills, verified projects, and interview poise.'
    }
  ],
  targetRoles: ['Principals & Deans', 'Heads of Department (HODs)', 'Training & Placement Officers (TPOs)', 'Academic Placement Committees'],
  cta: {
    label: 'Start a Partnership Conversation',
    href: '#partner'
  }
};

// -------------------------------------------------------------
// 12. TEACHING & WORKSHOP GALLERY
// -------------------------------------------------------------
export const galleryContent = {
  eyebrow: 'In Action',
  headline: 'Classrooms, Workshops & Live Learning',
  description:
    'A glimpse into our interactive teaching methodology, live code walk-throughs, and collaborative student problem-solving sessions.',
  moments: [
    {
      title: 'Interactive Code Reviews',
      subtitle: 'Classroom & Virtual Sessions',
      category: 'Mentorship',
      desc: 'Analyzing algorithmic efficiency, edge cases, and clean architecture live with students.'
    },
    {
      title: 'Campus Career Workshops',
      subtitle: 'Partner Engineering Colleges',
      category: 'Workshops',
      desc: 'High-energy weekend bootcamps breaking down campus placement expectations.'
    },
    {
      title: '1-on-1 Mock Interview Drills',
      subtitle: 'Placement Readiness',
      category: 'Simulations',
      desc: 'Simulating rigorous technical interview scenarios with instant constructive critique.'
    },
    {
      title: 'Collaborative Capstone Sprints',
      subtitle: 'Hands-on Development',
      category: 'Projects',
      desc: 'Student cohorts building modular full-stack projects using modern version control.'
    }
  ]
};

// -------------------------------------------------------------
// 13. PROJECTS SHOWCASE
// -------------------------------------------------------------
export const projectsContent = {
  eyebrow: 'Practical Outcomes',
  headline: 'Sample Capstone Projects',
  description:
    'Students in our programs do not build toy apps. They design and deploy robust, production-grade applications that demonstrate real engineering competence.',
  projects: [
    {
      title: 'Distributed E-Commerce API',
      category: 'Backend Architecture',
      tech: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
      problem: 'High-concurrency order processing with idempotency and optimistic locking.',
      outcome: 'Handled simulated 10,000 req/sec with atomic transactions and automated unit tests.'
    },
    {
      title: 'Real-Time Collaborative Code Editor',
      category: 'Full-Stack & Systems',
      tech: ['Next.js', 'WebSockets', 'CRDTs', 'TailwindCSS'],
      problem: 'Conflict-free collaborative document editing across concurrent remote browser sessions.',
      outcome: 'Sub-50ms synchronization latency with syntax highlighting and isolated sandboxes.'
    },
    {
      title: 'Institutional Placement Analytics Engine',
      category: 'Data & Dashboard',
      tech: ['Next.js App Router', 'Drizzle ORM', 'PostgreSQL', 'Recharts'],
      problem: 'Multi-tenant cohort performance aggregation and predictive placement readiness scoring.',
      outcome: 'Zero-drift relational schema with RBAC and exportable student capability reports.'
    }
  ]
};

// -------------------------------------------------------------
// 14. RESOURCES & OPPORTUNITIES
// -------------------------------------------------------------
export const resourcesContent = {
  eyebrow: 'Ecosystem Access',
  headline: 'Resources & Continuous Learning',
  description:
    'RMS Careers supports engineering learners well beyond classroom lectures with high-yield study materials and guided roadmaps.',
  resources: [
    {
      title: 'Pattern-First DSA Sheets',
      type: 'Interactive Problem Sets',
      desc: 'Curated algorithmic problems organized by core pattern. Practice free in your browser with zero login.',
      href: '/learn/dsa',
      cta: 'Explore DSA Sheets'
    },
    {
      title: 'Computer Science Roadmaps',
      type: 'Curriculum Guidance',
      desc: 'Semester-by-semester roadmaps detailing essential programming languages, system concepts, and project milestones.',
      href: '/curriculum',
      cta: 'View Roadmaps'
    },
    {
      title: 'Company Preparation Sheets',
      type: 'Interview Resources',
      desc: 'Targeted technical problem sets and behavioral guides for major campus recruitment drives.',
      href: '#partner',
      cta: 'Inquire for Cohorts'
    }
  ]
};

// -------------------------------------------------------------
// 15. FAQ SECTION
// -------------------------------------------------------------
export const faqContent = {
  eyebrow: 'Frequently Asked Questions',
  headline: 'Clear Answers for Colleges & Students',
  description:
    'Everything you need to know about our institutional partnerships, student learning paths, and career readiness delivery.',
  faqs: [
    {
      question: 'Who is RMS Careers designed for?',
      answer:
        'RMS Careers is engineered primarily for B.Tech engineering students across all branches (CSE, IT, ECE, EEE, Mechanical, Civil, etc.) and all academic years (1st through 4th year). Our curriculum scales from foundational programming up to advanced placement interview preparation.'
    },
    {
      question: 'How does the institutional college partnership work?',
      answer:
        'We collaborate directly with college leadership (Principals, Deans, TPOs, HODs) to establish a formal partnership or MoU. We then schedule and deliver tailored cohort programs for student batches, handling instruction, projects, mentorship, and readiness evaluations.'
    },
    {
      question: 'What is included in the 1-Month Career Readiness Program?',
      answer:
        'The program integrates all six RMS pillars: foundational technical skills, production project engineering, career preparation (resume/LinkedIn/aptitude), job preparation (company-specific drills/mock interviews), curated digital resources, and live tutor mentorship.'
    },
    {
      question: 'Is RMS Careers an individual course marketplace?',
      answer:
        'No. RMS Careers operates on an institutional, cohort-based model partnering directly with engineering colleges. We do not sell retail individual courses or operate public checkout carts. However, we provide free starter DSA sheets for independent learners.'
    },
    {
      question: 'How are live sessions and mentorship delivered?',
      answer:
        'Sessions are conducted through a blend of interactive live workshops, hands-on coding labs, and small-group mentor code reviews led by software practitioners.'
    },
    {
      question: 'Can students access practice materials without an institutional enrollment?',
      answer:
        'Yes! We believe in respecting learner autonomy. Our public starter DSA sheets at /learn/dsa are 100% free and execute locally in browser storage with zero sign-up required.'
    },
    {
      question: 'How do tutors and college administrators track student progress?',
      answer:
        'Our platform provides dedicated, isolated application surfaces: tutor.rms-careers.com for mentors to evaluate submissions, and admin.rms-careers.com for institutional batch administration and analytics.'
    },
    {
      question: 'What happens after an institution submits a partnership inquiry?',
      answer:
        'Our academic coordination team reviews your institution profile, student strength, and timeline, then reaches out within 1 business day to schedule a consultative discussion and tailored program walkthrough.'
    }
  ]
};



// -------------------------------------------------------------
// 17. INSTITUTIONAL PARTNERSHIP FORM
// -------------------------------------------------------------
export const partnershipFormContent = {
  eyebrow: 'Institutional Engagement',
  headline: 'Partner With RMS Careers',
  subhead: 'Bring enterprise-grade technical training and career readiness to your engineering students.',
  institutionTypes: ['Engineering College / University', 'Autonomous Institute', 'Deemed University', 'Polytechnic / Technical Institute', 'Other Academic Body'],
  timelineOptions: ['Immediate (Within 30 Days)', 'Within 1–3 Months', 'Upcoming Semester', 'Next Academic Year', 'Exploring Opportunities'],
  objectiveOptions: [
    'Elevate Campus Placement Rates',
    'Strengthen Algorithmic & DSA Foundations',
    'Implement Production Full-Stack Projects',
    'Aptitude & Technical Mock Interviews',
    'Faculty Development & Curriculum Alignment'
  ]
};

// -------------------------------------------------------------
// COMPATIBILITY EXPORTS FOR SECTION COMPONENTS
// -------------------------------------------------------------
export const programsContent = {
  eyebrow: 'Institutional Programs',
  headline: 'Active Cohort Programs',
  description: 'Structured technical training tracks delivered in collaboration with partner institutions.',
  viewAllCta: { label: 'Explore All Programs', href: '/programs' },
  emptyState: {
    badge: 'Institutional Partnerships',
    title: 'No Public Cohorts Currently Listed',
    description: 'Institutional batches are scheduled directly through college administration.',
    cta: { label: 'Partner With RMS', href: '#partner' }
  }
};

export const publicDsaContent = {
  eyebrow: 'Free Starter Catalog',
  headline: 'Practice Selected DSA Patterns',
  description: 'Explore curated algorithmic pattern sheets with zero account requirement. Progress is saved locally in your browser.',
  viewAllCta: { label: 'View All Sheets', href: '/learn' },
  privacyCallout: {
    title: 'Local Browser Evaluation',
    description: 'Practice free DSA problems without creating an account. Progress is stored locally in your browser.'
  }
};

export const capabilitiesContent = {
  eyebrow: 'Platform Capabilities',
  headline: 'What RMS Careers Delivers',
  description: 'An integrated ecosystem bridging academic foundations with enterprise readiness.',
  items: [
    {
      id: '01',
      title: 'Pattern-First DSA',
      tag: 'Algorithmic Mastery',
      description: 'Comprehensive algorithmic pattern training.',
      highlights: ['15 Algorithmic Patterns', 'Space-Time Invariants']
    },
    {
      id: '02',
      title: 'Production Engineering',
      tag: 'Full-Stack Architecture',
      description: 'Full-stack software engineering with clean architecture.',
      highlights: ['Git Workflows', 'Database Modeling']
    },
    {
      id: '03',
      title: 'Institutional Cohorts',
      tag: 'Academic Partnership',
      description: 'Standardized cohort training for engineering colleges.',
      highlights: ['Roster Management', 'Analytics']
    }
  ]
};



// -------------------------------------------------------------
// COMPATIBILITY EXPORTS FOR LEGACY / FUTURE DEDICATED SECTIONS
// -------------------------------------------------------------
export const aboutContent = {
  eyebrow: 'About RMS Careers',
  headline: 'Engineering Pedagogy Built for Career Readiness',
  description: 'We partner with academic institutions to equip B.Tech engineering students with practical technical excellence.',
  pillars: [
    { title: 'Pattern-Based Training', description: 'Deep conceptual foundations and algorithmic intuition.' },
    { title: 'Relational & Scalable Systems', description: 'Real software development architectures.' },
    { title: 'Institutional Accountability', description: 'Standardized batch delivery and cohort progress analytics.' }
  ]
};

export const trustContent = {
  eyebrow: 'Integrity & Rigor',
  headline: 'Built on Engineering Standards',
  statement: 'Engineering Rigor Over Marketing Exaggerations.',
  description: 'Transparent pedagogy with zero unsubstantiated claims.',
  principles: [
    {
      badge: 'Pedagogy',
      title: 'No Guaranteed Placement Gimmicks',
      description: 'We believe real skills create genuine opportunities.'
    },
    {
      badge: 'Architecture',
      title: 'Strict Privacy Boundaries',
      description: 'Public practice requires zero login. Authenticated portals remain secure.'
    },
    {
      badge: 'Reliability',
      title: 'Dedicated Domain Architecture',
      description: 'Isolated portal surfaces ensure focused environments.'
    }
  ]
};


