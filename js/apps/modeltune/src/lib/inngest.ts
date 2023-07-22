import { TrainingEvents } from '@app/app/tasks/training_job';
import { EventSchemas, Inngest } from 'inngest';

// Create a client to send and receive events
export const inngest = new Inngest({
  name: 'Modeltune',
  schemas: new EventSchemas().fromRecord<TrainingEvents>(),
});
