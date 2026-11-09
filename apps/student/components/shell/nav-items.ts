import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  Code2,
  House,
  Library,
  User,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  title: string;
  /** Route prefix the item owns. Hrefs are stable: the e2e journey and bookmarks rely on them. */
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
}

/** Main navigation, in the order students use it (sidebar, and the "More" sheet on phones). */
export const STUDENT_NAV_ITEMS: NavItem[] = [
  { title: 'Home', href: '/overview', icon: House },
  { title: 'Curriculum', href: '/batches', icon: BookOpen },
  { title: 'DSA practice', href: '/dsa', icon: Code2 },
  { title: 'Tests', href: '/assessments', icon: ClipboardCheck },
  { title: 'Library', href: '/library', icon: Library },
  { title: 'Leaderboard', href: '/leaderboards', icon: BarChart3 }
];

/** Secondary destinations, below a divider in the sidebar. */
export const STUDENT_SECONDARY_NAV_ITEMS: NavItem[] = [
  { title: 'Notifications', href: '/notifications', icon: Bell },
  { title: 'Profile', href: '/profile', icon: User }
];

/** Phone tab bar: the four places students go most, plus "More" for everything else. */
export const STUDENT_TAB_ITEMS: { title: string; href: string; icon: LucideIcon }[] = [
  { title: 'Home', href: '/overview', icon: House },
  { title: 'Learn', href: '/batches', icon: BookOpen },
  { title: 'Practice', href: '/dsa', icon: Code2 },
  { title: 'Tests', href: '/assessments', icon: ClipboardCheck }
];

function inRoute(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Whether a nav item is the current section. Nested routes count (/batches/abc is Curriculum). */
export function isNavItemActive(pathname: string, href: string): boolean {
  return inRoute(pathname, href);
}

/** Routes that are not nav items but belong to a section for wayfinding (e.g. a lesson opened from the library). */
const SECTION_OVERRIDES: { prefix: string; title: string }[] = [{ prefix: '/content', title: 'Lesson' }];

/** "Where am I?": the section name for the header, from the nav item whose route the path is in. */
export function sectionTitleFor(pathname: string): string {
  const override = SECTION_OVERRIDES.find((o) => inRoute(pathname, o.prefix));
  if (override) return override.title;
  return (
    [...STUDENT_NAV_ITEMS, ...STUDENT_SECONDARY_NAV_ITEMS].find((item) => inRoute(pathname, item.href))?.title ??
    'Student Portal'
  );
}
