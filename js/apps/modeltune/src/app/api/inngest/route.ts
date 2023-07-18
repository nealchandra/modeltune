import * as trainingFns from '@app/app/tasks/training_job';
import { inngest } from '@app/lib/inngest';
import { serve } from 'inngest/next';

export const { GET, POST, PUT } = serve(inngest, [
  trainingFns.startTrainingJob,
  trainingFns.endTrainingJob,
  trainingFns.failTrainingJob,
  trainingFns.createTrainingStep,
  trainingFns.createTrainingLog,
]);
