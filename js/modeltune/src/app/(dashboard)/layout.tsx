// import { DashboardNav } from '@/components/nav';
import { SiteFooter } from '@app/components/footer';
// import { UserAccountNav } from '@/components/user-account-nav';
// import { getCurrentUser } from '@/lib/session';
import { TopNav } from '@app/components/top-nav';
import { notFound } from 'next/navigation';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

const DashboardNavItems = [
  {
    title: 'Playground',
    href: '/playground',
  },
];

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  //   const user = await getCurrentUser();

  //   if (!user) {
  //     return notFound();
  //   }

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <TopNav items={DashboardNavItems} />
          {/* <UserAccountNav
            user={{
              name: user.name,
              image: user.image,
              email: user.email,
            }}
          /> */}
        </div>
      </header>
      <div className="container grid flex-1 gap-12">
        {/* <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav items={dashboardConfig.sidebarNav} />
        </aside> */}
        <main className="flex w-full flex-1 flex-col">{children}</main>
      </div>
      <SiteFooter className="border-t" />
    </div>
  );
}