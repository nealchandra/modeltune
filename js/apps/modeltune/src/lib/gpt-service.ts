import { Prisma, TrainingJob } from '@prisma/client';
import zod from 'zod';

export const FinetuneParametersSchema = zod.object({
  modelName: zod.string(),
  baseModel: zod.string(),
  datasetRepoId: zod.string(),
  promptTemplate: zod.string(),
  wandbKey: zod.string().optional(),
});

export const startFinetune = async (
  user: Prisma.UserGetPayload<{ include: { settings: true } }>,
  job: TrainingJob
) => {
  const paramters = FinetuneParametersSchema.parse(job.parameters);

  return await fetch(`https://nealcorp--gpt-service-web.modal.run/train`, {
    method: 'POST',
    body: JSON.stringify({
      model_name: paramters.modelName,
      base_model_repo_id: paramters.baseModel,
      dataset_repo_id: paramters.datasetRepoId,
      prompt_template: paramters.promptTemplate,
      job_id: job.id,
      wandb_key: user.settings?.wandbKey ?? null,
      ...(process.env.VERCEL_ENV === 'preview'
        ? { env: process.env.VERCEL_GIT_COMMIT_REF }
        : {}),
    }),
    headers: { 'Content-Type': 'application/json' },
  });
};
