import { startFinetune } from '@app/lib/gpt-service';
import { inngest } from '@app/lib/inngest';
import {
  TrainingJobStatus,
  TrainingJobStepTypes,
  TrainingJobTypes,
} from '@prisma/client';

import { prisma as db } from '@js/db';

type StartTrainingJob = {
  data: {
    jobId: string;
  };
};

type EndTrainingJob = {
  data: {
    jobId: string;
  };
};

type FailTrainingJob = {
  data: {
    jobId: string;
    reason?: string;
  };
};

type CreateTrainingStep = {
  data: {
    jobId: string;
    stepType: TrainingJobStepTypes;
    payload?: Object;
  };
};

type CreateTrainingLog = {
  data: {
    jobId: string;
    log: string;
  };
};

export type TrainingEvents = {
  'training/job.start': StartTrainingJob;
  'training/job.finish': EndTrainingJob;
  'training/job.fail': FailTrainingJob;
  'training/step.create': CreateTrainingStep;
  'training/log.create': CreateTrainingLog;
};

export const startTrainingJob = inngest.createFunction(
  { name: 'Training job started' },
  { event: 'training/job.start' },
  async ({ event, step }) => {
    const job = await db.trainingJob.findUnique({
      where: {
        id: event.data.jobId,
      },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Job ${event.data.jobId} not found`);
    }

    if (job.type !== TrainingJobTypes.FINETUNE) {
      throw new Error(`Non finetune jobs not implemented`);
    }

    // await step.run('Initiate remote training job', async () => {
    //   return await startFinetune(job.user, job);
    // });

    // Wait for job to finish
    // @ts-ignore
    const jobFinished = await step.waitForEvent('training/job.finish', {
      match: 'data.jobId',
      timeout: '24h', // wait at most 24 hours
    });

    if (!jobFinished) {
      await step.run('Mark job as failed', () => {
        return step.sendEvent({
          name: 'training/job.fail',
          data: {
            jobId: event.data.jobId,
            reason: 'Training failed to complete within 24 hours',
          },
        });
      });
    }
  }
);

export const endTrainingJob = inngest.createFunction(
  { name: 'Training job finished' },
  { event: 'training/job.finish' },
  async ({ event, step }) => {
    await step.sendEvent({
      name: 'training/step.create',
      data: {
        jobId: event.data.jobId,
        stepType: TrainingJobStepTypes.JOB_COMPLETED,
      },
    });
    await step.run('Update job record', async () => {
      await db.trainingJob.update({
        where: {
          id: event.data.jobId,
        },
        data: {
          status: TrainingJobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });
  }
);

export const failTrainingJob = inngest.createFunction(
  { name: 'Training job failed' },
  { event: 'training/job.fail' },
  async ({ event, step }) => {
    await step.sendEvent({
      name: 'training/step.create',
      data: {
        jobId: event.data.jobId,
        stepType: TrainingJobStepTypes.JOB_FAILED,
        payload: {
          reason: event.data.reason,
        },
      },
    });
    await step.run('Update job record', async () => {
      await db.trainingJob.update({
        where: {
          id: event.data.jobId,
        },
        data: {
          status: TrainingJobStatus.FAILED,
          completedAt: new Date(),
        },
      });
    });
  }
);

export const createTrainingStep = inngest.createFunction(
  { name: 'Training step created' },
  { event: 'training/step.create' },
  async ({ event, step }) => {
    await db.trainingJobStep.create({
      data: {
        trainingJobId: event.data.jobId,
        type: event.data.stepType,
        ...(event.data.payload ? { data: event.data.payload as any } : {}),
      },
    });
  }
);

export const createTrainingLog = inngest.createFunction(
  { name: 'Training log created' },
  { event: 'training/log.create' },
  async ({ event, step }) => {
    await db.trainingJobLog.create({
      data: {
        trainingJobId: event.data.jobId,
        content: event.data.log,
      },
    });
  }
);
