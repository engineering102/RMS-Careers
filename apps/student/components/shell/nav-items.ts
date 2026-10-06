import {
  LayoutDashboard,
  BookOpen,
  Library,
  Code2,
  ClipboardCheck,
  Trophy,
  Bell,
  User,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  description?: string;
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  {
    title: 'Overview',
    href: '/overview',
    icon: LayoutDashboard,
    description: 'Aggregated feed, XP, streaks, and upcoming deadlines'
  },
  {
    title: 'Batch Workspace',
    href: '/batches',
    icon: BookOpen,
    description: 'Chronological weekly milestone curriculum'
  },
  {
    title: 'My Library',
    href: '/library',
    icon: Library,
    description: 'Searchable topic-filtered self-paced repository'
  },
  {
    title: 'DSA Practice',
    href: '/dsa',
    icon: Code2,
    description: 'Curated problem patterns & progress tracker'
  },
  {
    title: 'Assessments',
    href: '/assessments',
    icon: ClipboardCheck,
    description: 'Practice knowledge checks & assessment center'
  },
  {
    title: 'Leaderboards',
    href: '/leaderboards',
    icon: Trophy,
    description: 'College & batch peer rankings'
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    description: 'In-app alert drawer & milestone updates'
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: User,
    description: 'Academic details, portfolio links & 30-day heatmap'
  }
];
