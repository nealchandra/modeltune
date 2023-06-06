import { SiteFooter } from '@app/components/footer';
import { TopNav } from '@app/components/top-nav';
import { notFound } from 'next/navigation';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

const DashboardNavItems = [
  {
    title: 'Tune',
    href: '/tune',
  },
  {
    title: 'Playground',
    href: '/playground',
  },
];

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <TopNav items={DashboardNavItems} />
        </div>
      </header>
      <div className="container grid flex-1 gap-12">
        <main className="flex w-full flex-1 flex-col">{children}</main>
      </div>
      <SiteFooter className="border-t" />
    </div>
  );
}
