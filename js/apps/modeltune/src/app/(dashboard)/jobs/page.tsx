import { Shell } from '@app/components/shell';
import { getCurrentUserOrThrow } from '@app/lib/session';
// import { UserSettings } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { prisma as db } from '@js/db';

import { SettingsCard } from './settings-card';

export default async function JobsPage() {
  const user = await getCurrentUserOrThrow();

  return (
    <Shell>
      <div className="grid grid-cols-3">
        <div className="col-start-2 col-end-3"></div>
      </div>
    </Shell>
  );
}
