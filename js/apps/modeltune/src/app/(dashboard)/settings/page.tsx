import { Shell } from '@app/components/shell';
import { getCurrentUser } from '@app/lib/session';
import { UserSettings } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { prisma as db } from '@js/db';

import { SettingsCard } from './settings-card';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const userSettings = await db.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      hfAccessToken: null,
      wandbKey: null,
    },
  });

  // NOTE: decide whether to move this into actions folder, could also use zod validation
  const updateUserSettings = async (settings: UserSettings) => {
    'use server';

    const changes = {
      ...(settings.hfAccessToken != null && settings.hfAccessToken != ''
        ? { hfAccessToken: settings.hfAccessToken }
        : {}),
      ...(settings.wandbKey != null && settings.wandbKey != ''
        ? { wandbKey: settings.wandbKey }
        : {}),
    };

    await db.userSettings.update({
      where: {
        userId: user.id,
      },
      data: changes,
    });

    revalidatePath('/settings');
  };

  return (
    <Shell>
      <div className="grid grid-cols-3">
        <div className="col-start-2 col-end-3">
          <SettingsCard
            settings={userSettings}
            updateUserSettings={updateUserSettings}
          />
        </div>
      </div>
    </Shell>
  );
}
