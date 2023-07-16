'use client';

import * as React from 'react';

import { autocompleteDatasets, getDatasetInfo } from '../../_actions/hf';
import { BASE_MODELS, BASE_MODEL_NAMES } from '../useModelPlayground';
import { startFinetune } from '@app/app/_actions/tuning';
import { Icons } from '@app/components/icons';
import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@app/components/ui/command';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@app/components/ui/form';
import { Input } from '@app/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@app/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@app/components/ui/table';
import { Textarea } from '@app/components/ui/textarea';
import { cn } from '@app/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { debounce } from 'lodash';
import { Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { fromTheme } from 'tailwind-merge';
import * as z from 'zod';
import { string } from 'zod';

import { DatasetPreview } from './dataset-preview';

function zodEnumFromObjValues<K extends string>(
  obj: Record<any, K>
): z.ZodEnum<[K, ...K[]]> {
  const [firstKey, ...otherKeys] = Object.values(obj) as K[];
  return z.enum([firstKey, ...otherKeys]);
}

const baseModelChoices = zodEnumFromObjValues(BASE_MODELS);

const formSchema = z.object({
  name: z
    .string()
    .nonempty()
    .regex(/^[a-zA-Z0-9-_]+$/),
  baseModel: baseModelChoices,
  dataset: z.object({
    id: z.string(),
    id_case_sensitive: z.string(),
    private: z.boolean(),
  }),
  promptTemplate: z.string().nonempty(),
  feature: z.string().nonempty({ message: 'Must select a feature' }),
});

export default function Tune() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [datasets, setDatasets] = React.useState<
    Array<{ id: string; value: string; label: string; private: boolean }>
  >([]);
  const [features, setFeatures] = React.useState<Array<string>>([]);
  const [submissionData, setSubmissionData] =
    React.useState<Partial<z.infer<typeof formSchema>>>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      baseModel: BASE_MODELS.FALCON,
      promptTemplate: '',
      feature: '',
      dataset: undefined,
    },
  });
  const datasetWatch = form.watch('dataset');
  const featureWatch = form.watch('feature');
  const promptTemplateWatch = form.watch('promptTemplate');
  const isPrivateDataset = form.watch('dataset.private');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    await startFinetune({
      modelName: values.name,
      baseModel: values.baseModel,
      datasetRepoId: values.dataset.id,
      promptTemplate: values.promptTemplate,
    });
    setLoading(false);
    setSubmissionData(values);
  }

  React.useEffect(() => {
    const dataset = form.getValues('dataset');
    if (!dataset) return;

    if (!dataset.private) {
      getDatasetInfo(dataset.id_case_sensitive).then((response) => {
        const features = Object.keys(response.dataset_info.features);
        setFeatures(features);
        form.setValue('feature', features?.[0]);
      });
    }
  }, [datasetWatch]);

  React.useEffect(() => {
    form.setValue('promptTemplate', `{{${featureWatch}}}`);
  }, [featureWatch]);

  const updateDatasets = (e: Event) =>
    autocompleteDatasets((e.target as HTMLInputElement).value).then((resp) => {
      setDatasets(resp);
    });

  const updateDatasetsDebounced = React.useCallback(
    debounce(updateDatasets, 200),
    []
  );

  if (submissionData) {
    return (
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>{submissionData.name}</CardTitle>
          <CardDescription>
            Finetune started. You can monitor the run on wandb.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <p>
              <b>Base Model:</b>
            </p>
            <p>{submissionData.baseModel}</p>
          </div>
          <div className="flex items-center space-x-2">
            <p>
              <b>Dataset:</b>
            </p>
            <p>{submissionData.dataset!.id}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="storywriter-lora" {...field} />
                </FormControl>
                <FormDescription>
                  This is the name of your finetuned model
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baseModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Model</FormLabel>
                <Select onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select base model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(
                      Object.keys(BASE_MODELS) as Array<
                        keyof typeof BASE_MODELS
                      >
                    ).map((key) => (
                      <SelectItem key={key} value={BASE_MODELS[key]}>
                        {BASE_MODEL_NAMES[BASE_MODELS[key]]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  The base model to begin finetuning from.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dataset"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Dataset</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'w-[400px] justify-between',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value
                          ? datasets.find(
                              (dataset) => dataset.value === field.value?.id
                            )?.label
                          : 'Select dataset'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Enter dataset name..."
                        onInputCapture={
                          updateDatasetsDebounced as unknown as React.FormEventHandler<HTMLInputElement>
                        }
                      />
                      <CommandEmpty>No dataset found.</CommandEmpty>
                      <CommandGroup>
                        {datasets.map((dataset) => (
                          <CommandItem
                            value={dataset.value}
                            key={dataset.value}
                            onSelect={(value) => {
                              setFeatures([]);
                              form.setValue('feature', '');
                              form.setValue('dataset', {
                                id: dataset.value,
                                id_case_sensitive: dataset.id,
                                private: dataset.private,
                              });
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                dataset.value === field.value?.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {dataset.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  This is the huggingface dataset to use for training
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isPrivateDataset && features.length ? (
            <FormField
              control={form.control}
              name="feature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dataset Key</FormLabel>
                  <Select
                    disabled={!features.length}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dataset feature" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {features.map((feature) => (
                        <SelectItem key={feature} value={feature}>
                          {feature}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The key of the feature from the dataset to use for the base
                    prompt template.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {isPrivateDataset ? (
            <FormField
              control={form.control}
              name="feature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dataset Key</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="text" {...field} />
                  </FormControl>
                  <FormDescription>
                    The key of the feature from the dataset to use for training
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {featureWatch ? (
            <FormField
              control={form.control}
              name="promptTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Template</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormDescription>
                    The template to use to generate training data. Preview is
                    shown on the right.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <Button type="submit">
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </form>
      </Form>
      <DatasetPreview
        dataset_id={!featureWatch ? '' : datasetWatch?.id_case_sensitive}
        prompt_template={promptTemplateWatch}
      />
    </>
  );
}
