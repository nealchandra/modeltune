import { Shell } from '@app/components/shell';
import { Card, CardContent } from '@app/components/ui/card';
import { Label } from '@app/components/ui/label';
import { getCurrentUser, getCurrentUserOrThrow } from '@app/lib/session';
// import { UserSettings } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';

import { prisma as db } from '@js/db';

import { FullTrainingJob, TrainingInfo } from './training-info';

export default async function JobsDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const user = await getCurrentUserOrThrow();
  const trainingJob = await db.trainingJob.findUnique({
    where: {
      id: params.jobId,
    },
  });

  if (!trainingJob || trainingJob.userId != user.id) {
    notFound();
  }

  const fetchTrainingJob = async () => {
    'use server';

    return (await db.trainingJob.findUnique({
      where: {
        id: params.jobId,
      },
      include: {
        logs: true,
        steps: true,
      },
    })) as FullTrainingJob;
  };

  return (
    <Shell>
      <div className="grid grid-cols-3">
        <div className="col-start-1 col-end-2">
          <h2 className="text-3xl font-bold tracking-tight">Job Details</h2>
          <Label>
            <strong>ID:</strong>
            {trainingJob.id}
          </Label>
        </div>
        <div className="col-span-2">
          <TrainingInfo fetchTrainingJob={fetchTrainingJob} />
        </div>
      </div>
    </Shell>
  );
}
