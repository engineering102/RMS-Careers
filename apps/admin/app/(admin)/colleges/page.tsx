import { Building2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getColleges } from '@/lib/db/queries';
import { EmptyState } from '@/components/admin/empty-state';
import { CollegesClient } from './colleges-client';

export const metadata = {
  title: 'Colleges | Academy Enrollment'
};

export const dynamic = 'force-dynamic';

export default async function CollegesPage() {
  const session = await auth();
  if (session?.user?.role !== 'super_admin') {
    return (
      <EmptyState
        icon={Building2}
        title="Access restricted"
        description="College management is available to super administrators only."
      />
    );
  }

  const colleges = await getColleges();
  return <CollegesClient initialColleges={colleges} />;
}
