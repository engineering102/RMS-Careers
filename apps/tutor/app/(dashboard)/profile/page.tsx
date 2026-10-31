import { requireTutor } from '@/lib/db/tutor-context';
import { getTutorProfile } from '@/lib/db/queries/profile';
import { PageHeader } from '@/components/ui/page-header';
import { PasswordForm, ProfileForm } from './profile-form';

export const metadata = { title: 'Profile — RMS Tutor Portal' };

export default async function ProfilePage() {
  const tutor = await requireTutor();
  const profile = await getTutorProfile(tutor.tutorId);

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="How you appear to the RMS team. Your name and email are managed by your coordinator." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="details-heading" className="space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 id="details-heading" className="font-semibold">Details</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-[100px_minmax(0,1fr)]">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{profile?.fullName ?? tutor.fullName}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{tutor.email}</dd>
          </dl>
          {profile ? <ProfileForm profile={profile} /> : <p className="text-sm text-muted-foreground">Your profile could not be loaded.</p>}
        </section>
        <section aria-labelledby="password-heading" className="h-fit space-y-4 rounded-lg border border-border bg-card p-4">
          <h2 id="password-heading" className="font-semibold">Change password</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
