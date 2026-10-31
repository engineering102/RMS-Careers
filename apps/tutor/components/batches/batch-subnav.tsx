'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { segment: '', label: 'Home' },
  { segment: '/students', label: 'Students' },
  { segment: '/projects', label: 'Projects' },
  { segment: '/assessments', label: 'Assessments' },
  { segment: '/curriculum', label: 'Curriculum' },
  { segment: '/live', label: 'Live classes' }
] as const;

export function BatchSubnav({ batchId }: { batchId: string }) {
  const pathname = usePathname();
  const base = `/batches/${batchId}`;
  return (
    <nav aria-label="Batch sections" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1 px-1">
        {SECTIONS.map((s) => {
          const href = `${base}${s.segment}`;
          const active = s.segment === '' ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={s.segment}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center whitespace-nowrap rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
