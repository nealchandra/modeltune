'use server';

import { getCurrentUserOrThrow } from '@app/lib/session';

import { prisma as db } from '@js/db';

type FinetuneArgs = {
  modelName: string;
  baseModel: string;
  datasetRepoId: string;
  promptTemplate: string;
};

export const startFinetune = async ({
  modelName,
  baseModel,
  datasetRepoId,
  promptTemplate,
}: FinetuneArgs) => {
  const user = await getCurrentUserOrThrow();
  const settings = await db.userSettings.findFirst({
    where: {
      userId: user.id,
    },
  });

  const response = await fetch(
    `https://nealcorp--gpt-service-web.modal.run/train`,
    {
      method: 'POST',
      body: JSON.stringify({
        model_name: modelName,
        base_model_repo_id: baseModel,
        dataset_repo_id: datasetRepoId,
        prompt_template: promptTemplate,
        wandb_key: settings?.wandbKey ?? null,
      }),
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const result = await response.json();
  return result;
};
