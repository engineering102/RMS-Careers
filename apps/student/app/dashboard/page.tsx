import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getStudentIdentity } from '@/lib/db/student-identity';

const futureAreas = ['My Learning', 'My Progress', 'Practice', 'Leaderboard', 'Profile'];
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'student') redirect('/login');
  const student = await getStudentIdentity(session.user.id);
  if (!student) redirect('/login?error=Unauthorized');
  return <main className="min-h-screen p-5 md:p-10"><div className="mx-auto max-w-5xl"><p className="text-sm font-semibold text-blue-300">RMS CAREERS · STUDENT PORTAL</p><h1 className="mt-2 text-3xl font-bold">Welcome, {student.name}</h1><p className="mt-2 text-slate-300">{student.collegeName || 'Your institution'} · Your authenticated learning workspace</p><section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{futureAreas.map((area) => <article key={area} className="min-h-32 rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-lg font-semibold">{area}</h2><p className="mt-2 text-sm text-slate-400">Available in a future Student Portal phase.</p></article>)}</section></div></main>;
}
