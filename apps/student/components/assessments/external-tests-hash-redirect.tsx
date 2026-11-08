'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Older links (deadline notifications, bookmarks) point at `/assessments#external-tests`. The fragment never reaches
 * the server, so map it to the External tab here.
 */
export function ExternalTestsHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (window.location.hash !== '#external-tests' || searchParams.get('type')) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', 'external');
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
