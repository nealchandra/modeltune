'use server';

import { getCurrentUserOrThrow } from '@app/lib/session';

import { prisma as db } from '@js/db';

export const getHfHeaders = async () => {
  const user = await getCurrentUserOrThrow();
  // seems like ideally there would be a way to cache this lookup for a bit
  // cache mechanism here doesn't seem possible to invalidate when settings change
  // https://nextjs.org/docs/app/building-your-application/data-fetching/caching#per-request-caching
  const settings = await db.userSettings.findFirst({
    where: {
      userId: user.id,
    },
  });

  return settings
    ? {
        Authorization: `Bearer ${settings.hfAccessToken}`,
      }
    : undefined;
};

export const autocompleteDatasets = async (
  txt: string
): Promise<
  { id: string; label: string; value: string; private: boolean }[]
> => {
  const headers = await getHfHeaders();
  const response = await fetch(
    `https://huggingface.co/api/datasets?search=${txt}&limit=10`,
    {
      headers,
      method: 'GET',
    }
  );
  const result = await response.json();
  return result.map((ds: any) => ({
    id: ds.id,
    value: ds.id.toLowerCase(),
    label: ds.id.toLowerCase(),
    private: ds.private,
  }));
};

export const getDatasetInfo = async (dataset_id: string) => {
  const headers = await getHfHeaders();
  const response = await fetch(
    `https://datasets-server.huggingface.co/info?dataset=${dataset_id}&config=${dataset_id.replace(
      '/',
      '--'
    )}`,
    {
      headers,
      method: 'GET',
    }
  );

  const result = await response.json();
  return result;
};

export const getDatasetRows = async (dataset_id: string) => {
  const headers = await getHfHeaders();
  const response = await fetch(
    `https://datasets-server.huggingface.co/rows?dataset=${dataset_id}&config=${dataset_id.replace(
      '/',
      '--'
    )}&length=10&split=train`,
    {
      headers,
      method: 'GET',
    }
  );

  const result = await response.json();
  return result;
};
