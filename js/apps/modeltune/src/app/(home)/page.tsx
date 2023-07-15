import { buttonVariants } from '@app/components/ui/button';
import { Card, CardContent, CardTitle } from '@app/components/ui/card';
import { getCurrentUser } from '@app/lib/session';
import { cn } from '@app/lib/utils';
import Link from 'next/link';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="container relative hidden h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="relative hidden h-full text-white dark:border-r lg:flex">
        <div className="w-full h-full flex items-center justify-center flex-col p-10">
          <div className="relative z-20 flex items-center text-lg font-medium m-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Modeltune
          </div>
          {user ? (
            <div className="flex">
              <Link
                type="button"
                className={cn(buttonVariants({ variant: 'default' }), 'mx-2')}
                href="/playground"
              >
                Dashboard
              </Link>
              <Link
                type="button"
                className={cn(buttonVariants({ variant: 'outline' }), 'mx-2')}
                href="/api/auth/signout"
              >
                Sign Out
              </Link>
            </div>
          ) : (
            <Link
              type="button"
              className={cn(buttonVariants({ variant: 'default' }))}
              href="/login"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
