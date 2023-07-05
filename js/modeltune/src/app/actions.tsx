'use server';

export const autocompleteDatasets = async (
  txt: string
): Promise<{ label: string; value: string }[]> => {
  // const x = await fetch(
  //   'https://huggingface.co/api/quicksearch?q=lt-full&type=all',
  //   {
  //     headers: {
  //       Authorization: `Bearer ${'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'}`,
  //     },
  //     method: 'GET',
  //   }
  // );
  // const z = await x.json();
  // console.log(z);

  // fetch GET from 'https://huggingface.co/api/datasets' with query containing 'search'
  const response = await fetch(
    `https://huggingface.co/api/datasets?search=${txt}&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${'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'}`,
      },
      method: 'GET',
    }
  );
  const result = await response.json();
  return result.map((ds) => ({
    value: ds.id.toLowerCase(),
    label: ds.id.toLowerCase(),
    private: ds.private,
  }));
};

export const getDatasetInfo = async (dataset_id: string) => {
  const response = await fetch(
    `https://datasets-server.huggingface.co/info?dataset=${dataset_id}&config=${dataset_id.replace(
      '/',
      '--'
    )}`,
    {
      headers: {
        Authorization: `Bearer ${'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'}`,
      },
      method: 'GET',
    }
  );

  const result = await response.json();
  return result;
};
