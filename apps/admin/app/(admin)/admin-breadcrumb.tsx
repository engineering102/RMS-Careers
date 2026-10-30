'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';

const SECTIONS: { prefix: string; label: string }[] = [
  { prefix: '/programs', label: 'Programs' },
  { prefix: '/colleges', label: 'Colleges' },
  { prefix: '/batches', label: 'Batches' },
  { prefix: '/tutors', label: 'Tutors' },
  { prefix: '/enrollments', label: 'Enrollments' },
  { prefix: '/content', label: 'Content Library' }
];

/** "Academy / <current section>", matching the sidebar entry the page belongs to. */
export function AdminBreadcrumb() {
  const pathname = usePathname();
  const section = SECTIONS.find((s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`));

  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/programs">Academy</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {section && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {pathname === section.prefix ? (
                <BreadcrumbPage>{section.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={section.prefix}>{section.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
