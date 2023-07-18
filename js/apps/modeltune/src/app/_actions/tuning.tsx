'use server';

import { FinetuneParametersSchema } from '@app/lib/gpt-service';
import { inngest } from '@app/lib/inngest';
import { getCurrentUserOrThrow } from '@app/lib/session';
import { TrainingJobStepTypes, TrainingJobTypes } from '@prisma/client';

import { prisma as db } from '@js/db';

export const startFinetune = async (payload: Object) => {
  const user = await getCurrentUserOrThrow();
  const settings = await db.userSettings.findFirst({
    where: {
      userId: user.id,
    },
  });

  const parameters = FinetuneParametersSchema.parse(payload);

  // create training job
  const trainingJob = await db.trainingJob.create({
    data: {
      userId: user.id,
      type: TrainingJobTypes.FINETUNE,
      parameters: parameters,
    },
  });

  // trigger job started step
  inngest.send({
    name: 'training/step.create',
    data: {
      jobId: trainingJob.id,
      stepType: TrainingJobStepTypes.JOB_STARTED,
    },
  });

  return trainingJob;
};
