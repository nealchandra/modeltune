import { authOptions } from '@app/lib/auth';
import { getServerSession } from 'next-auth/next';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function getCurrentUserOrThrow() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user) {
    throw Error(
      'getCurrentUserOrThrow was called in a context where the user is not authenticated'
    );
  }
  return user;
}
