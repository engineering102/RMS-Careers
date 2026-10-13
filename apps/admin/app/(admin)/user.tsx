import { auth } from '@/lib/auth';
import { UserMenu } from './user-menu';

export async function User() {
  const session = await auth();
  const user = session?.user;

  return <UserMenu user={user ? { image: user.image ?? null } : null} />;
}
