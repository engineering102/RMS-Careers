/**
 * RMS Careers Homepage Content Slot Definitions
 * 
 * Separates layout and presentation structure from content and data.
 * All marketing copy, headlines, descriptions, CTAs, and feature points
 * can be replaced here without modifying component layouts.
 */

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  isExternal?: boolean;
}

export interface CtaButton {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface MetricItem {
  label: string;
  value: string;
  description?: string;
}

export interface CapabilityItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface JourneyStep {
  step: string;
  phase: string;
  title: string;
  description: string;
  badge: string;
}

export interface AudiencePanel {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  cta: CtaButton;
  badge: string;
}

export interface TrustPrinciple {
  title: string;
  description: string;
  badge: string;
}

export interface AboutPoint {
  title: string;
  description: string;
}

// -------------------------------------------------------------
// HERO CONTENT
// -------------------------------------------------------------
export const heroContent = {
  eyebrow: 'RMS Careers Technical Academy',
  headlinePrefix: 'Structured Technical Curriculum',
  headlineHighlight: 'Built for Engineering Careers',
  headlineSuffix: '',
  description:
    'RMS Careers connects academic institutions and ambitious learners with rigorous, pattern-driven computer science curriculum, production full-stack training, and an unauthenticated starter DSA practice portal.',
  primaryCta: {
    label: 'Practice Starter DSA (Free)',
    href: '/learn/dsa'
  },
  secondaryCta: {
    label: 'Explore Programs',
    href: '#programs'
  },
  proofPoints: [
    'No Login Required for Starter Sheets',
    'Zero Database Writes in Anonymous Mode',
    'Institutional Partner Cohorts'
  ],
  codeSnippet: {
    filename: 'TwoSum.ts',
    pattern: 'Hash Map Lookup Invariant',
    language: 'typescript',
    code: `// Pattern: Hash Map Complement Lookup (O(n) time, O(n) space)
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`
  },
  metrics: [
    { label: 'Starter DSA Questions', value: '10+' },
    { label: 'Algorithmic Patterns', value: '15' },
    { label: 'Guest Access', value: 'Instant' }
  ]
};

// -------------------------------------------------------------
// WHAT RMS CAREERS DELIVERS (CAPABILITIES)
// -------------------------------------------------------------
export const capabilitiesContent = {
  eyebrow: 'What RMS Careers Delivers',
  headline: 'Engineered for Real-World Competence',
  description:
    'A comprehensive technical ecosystem engineered to eliminate gaps between college classrooms and modern software engineering demands.',
  items: [
    {
      id: '01',
      tag: 'Algorithmic Mastery',
      title: 'Pattern-First DSA Curriculum',
      description:
        'Rather than memorizing arbitrary problems, learners master transferable algorithmic patterns—two pointers, sliding window, topological sort, and dynamic programming—transferable to any technical interview.',
      highlights: [
        '15 Core Algorithmic Patterns',
        'Time & Space Complexity Proofs',
        'Multi-Language Code Solutions'
      ]
    },
    {
      id: '02',
      tag: 'System Architecture',
      title: 'Production Full-Stack Engineering',
      description:
        'Hands-on training in modern stacks: Next.js App Router, TypeScript, relational databases (PostgreSQL/Drizzle), REST/GraphQL APIs, and server-side architecture.',
      highlights: [
        'Next.js 15 & Modern TypeScript',
        'Relational Schemas & Migrations',
        'Server-Authoritative Validation'
      ]
    },
    {
      id: '03',
      tag: 'Academic Scalability',
      title: 'Institutional Cohort Model',
      description:
        'Colleges partner with RMS Careers to deploy standardized, tutor-guided technical training for student batches with structured milestone reviews and batch analytics.',
      highlights: [
        'Isolated Institution Environments',
        'Dedicated Tutor Mentorship',
        'Verifiable Batch Analytics'
      ]
    }
  ]
};

// -------------------------------------------------------------
// PROGRAMS SHOWCASE CONTENT
// -------------------------------------------------------------
export const programsContent = {
  eyebrow: 'Available Offerings',
  headline: 'Public Training Programs',
  description:
    'Comprehensive technical training tracks designed to transition foundational computer science students into confident, production-grade software engineers.',
  viewAllCta: {
    label: 'View all programs',
    href: '/programs'
  },
  emptyState: {
    badge: 'Upcoming Cohorts',
    title: 'New Cohorts Opening Soon',
    description:
      'Public platform training cohorts are scheduled periodically throughout academic terms. You can explore structured curriculum tracks or start practicing with our starter DSA sheets immediately.',
    cta: {
      label: 'Browse Curriculum Pathways',
      href: '/curriculum'
    }
  }
};

// -------------------------------------------------------------
// PLATFORM JOURNEY (HOW THE PLATFORM WORKS)
// -------------------------------------------------------------
export const journeyContent = {
  eyebrow: 'Progression Framework',
  headline: 'How the Platform Works',
  description:
    'A transparent, step-by-step framework taking learners from fundamental concepts to verified technical competency.',
  steps: [
    {
      step: '01',
      phase: 'DISCOVER',
      title: 'Discovery & Orientation',
      description:
        'Explore curriculum pathways and test fundamental problem-solving concepts using our free, anonymous starter DSA sheets.',
      badge: 'Zero Sign-Up'
    },
    {
      step: '02',
      phase: 'LEARN',
      title: 'Institutional Onboarding',
      description:
        'Colleges enroll student batches into structured programs with direct tutor mentorship and scheduled curriculum milestones.',
      badge: 'Structured Milestones'
    },
    {
      step: '03',
      phase: 'PRACTICE',
      title: 'Active Practice & Review',
      description:
        'Students solve targeted problem sets, implement production full-stack assignments, and receive feedback from expert tutors.',
      badge: 'Tutor Mentorship'
    },
    {
      step: '04',
      phase: 'BUILD / ASSESS',
      title: 'Verifiable Readiness',
      description:
        'Tracked milestones, verified algorithmic competency, and capstone software artifacts prepare students for competitive engineering roles.',
      badge: 'Industry Standard'
    }
  ]
};

// -------------------------------------------------------------
// TWO-SIDED AUDIENCE SPLIT (STUDENTS VS INSTITUTIONS)
// -------------------------------------------------------------
export const audienceSplitContent = {
  eyebrow: 'Two-Sided Platform',
  headline: 'Tailored for Learners. Built for Institutions.',
  description:
    'Whether you are an aspiring engineer seeking problem-solving depth or an academic dean modernizing campus placement outcomes, RMS Careers provides purpose-built infrastructure.',
  students: {
    badge: 'For Students & Learners',
    eyebrow: 'Learner Experience',
    title: 'Develop Real Engineering Depth',
    description:
      'Bridge the gap between theoretical computer science coursework and the rigorous problem-solving standards expected by top engineering teams.',
    highlights: [
      'Curated, high-yield DSA sheets organized by pattern',
      'Multi-language code templates in Python, C++, Java, and JavaScript',
      'Free starter practice with zero login barriers or paywalls'
    ],
    cta: {
      label: 'Start with Free DSA Sheets',
      href: '/learn/dsa'
    }
  },
  institutions: {
    badge: 'For Academic Institutions',
    eyebrow: 'Campus Partnerships',
    title: 'Scale Technical Excellence Across Batches',
    description:
      'Equip campus engineering batches with enterprise-grade learning infrastructure, industry-standard curricula, and verifiable student progress tracking.',
    highlights: [
      'Multi-institution data isolation and dedicated batch orchestration',
      'Cross-college tutor assignments and standardized evaluations',
      'Administrative student roster imports via CSV/Excel'
    ],
    cta: {
      label: 'Inquire for Your College',
      href: '#contact'
    }
  }
};

// -------------------------------------------------------------
// PUBLIC STARTER DSA EXPERIENCE
// -------------------------------------------------------------
export const publicDsaContent = {
  eyebrow: 'Freemium Starter Catalog',
  headline: 'Public Starter DSA Sheets',
  description:
    'Solve curated algorithmic problems in your browser without signing up. Practice fundamental patterns anonymously with zero tracking.',
  privacyCallout: {
    badge: 'Anonymous Mode Guarantee',
    title: 'Zero Database Writes in Anonymous Mode',
    description:
      'Solved status is stored strictly in your browser localStorage. To maintain academic and leaderboard integrity, anonymous progress does not award server XP, update streaks, or sync to institutional rankings.'
  },
  viewAllCta: {
    label: 'Explore all starter sheets',
    href: '/learn/dsa'
  }
};

// -------------------------------------------------------------
// TRUST & STANDARDS SECTION
// -------------------------------------------------------------
export const trustContent = {
  eyebrow: 'Academic & Technical Standards',
  statement: 'No Exaggerations. Real Engineering Standards.',
  description:
    'RMS Careers does not make speculative placement guarantees or publish inflated statistics. We focus exclusively on what actually matters: rigorous curriculum design, deliberate algorithmic practice, verifiable student milestones, and transparent institutional collaboration.',
  principles: [
    {
      title: 'Server-Authoritative Metrics',
      description:
        'Authenticated student progress is calculated and secured server-side to guarantee uncompromised metrics for institutional reporting.',
      badge: 'Integrity First'
    },
    {
      title: 'Privacy by Design',
      description:
        'Anonymous visitors practice DSA sheets without tracking cookies, unauthenticated database writes, or forced registration.',
      badge: 'Zero Telemetry'
    },
    {
      title: 'Institutional Isolation',
      description:
        'Colleges maintain autonomous batch administration and student rosters with multi-role access control and strict boundary enforcement.',
      badge: 'Enterprise Security'
    }
  ]
};

// -------------------------------------------------------------
// ABOUT SECTION
// -------------------------------------------------------------
export const aboutContent = {
  eyebrow: 'About RMS Careers',
  headline: 'Bridging Academic Foundations and Industry Engineering',
  description:
    'RMS Careers is an independent technical education platform engineered to provide student engineers with pattern-driven problem solving, modern software construction, and verifiable career readiness.',
  pillars: [
    {
      title: 'Pattern-Driven Pedagogy',
      description:
        'We replace brute-force problem memorization with structured algorithmic patterns and architectural design invariants that transfer across real-world systems.'
    },
    {
      title: 'Transparent Institutional Partnerships',
      description:
        'We work hand-in-hand with academic institutions to provide faculty and placement teams with real-time insight into batch capability and project readiness.'
    },
    {
      title: 'Respect for Learner Autonomy',
      description:
        'Our public learning resources remain permanently free and anonymous, giving every engineering student an accessible entry point to deliberate practice.'
    }
  ]
};

// -------------------------------------------------------------
// CONTACT SECTION
// -------------------------------------------------------------
export const contactContent = {
  eyebrow: 'Inquiries & Collaborations',
  headline: 'Connect with RMS Careers',
  description:
    'Have questions about institutional cohorts, curriculum collaboration, or student practice? Reach out to our academic and technical coordination team.',
  contacts: [
    {
      label: 'Institutional & College Partnerships',
      value: 'partnerships@rmscareers.com',
      note: 'For college deans, department heads, and placement coordinators'
    },
    {
      label: 'Student Inquiries & Academic Support',
      value: 'admissions@rmscareers.com',
      note: 'For program inquiries and technical curriculum guidance'
    }
  ],
  responseNotice: 'Academic inquiries typically receive a response within 1 business day.'
};

// -------------------------------------------------------------
// FINAL CTA BANNER
// -------------------------------------------------------------
export const finalCtaContent = {
  badge: 'Get Started Today',
  headline: 'Begin Exploring the Curriculum',
  description:
    'Try our starter DSA questions right now in your browser. No sign-up, no credit card, and zero tracking.',
  primaryCta: {
    label: 'Open Starter Practice Sheets',
    href: '/learn/dsa'
  },
  secondaryCta: {
    label: 'Explore Public Programs',
    href: '#programs'
  }
};
