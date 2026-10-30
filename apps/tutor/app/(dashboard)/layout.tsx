import { requireTutor } from '@/lib/db/tutor-context';
import { TutorShell } from '@/components/shell/tutor-shell';

export const metadata = {
  title: 'Tutor Portal — RMS Careers',
  description: 'Review project submissions and follow the progress of your assigned batches.'
};

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Re-checks the account and assignments in the database on every request (lib/db/tutor-context.ts).
  const tutor = await requireTutor();
  return (
    <TutorShell fullName={tutor.fullName} email={tutor.email}>
      {children}
    </TutorShell>
  );
}
