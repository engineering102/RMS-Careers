'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TUTOR_NAV_ITEMS } from './nav-items';

export function TutorNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="order-last w-full overflow-x-auto sm:order-none sm:w-auto">
      <ul className="flex gap-1">
        {TUTOR_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
