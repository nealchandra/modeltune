'use client';

import * as React from 'react';

import { autocompleteDatasets, getDatasetInfo } from '../actions';
import { BASE_MODELS, BASE_MODEL_NAMES } from '../useModelPlayground';
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
import { cn } from '@app/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { debounce } from 'lodash';
import { Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { fromTheme } from 'tailwind-merge';
import * as z from 'zod';
import { string } from 'zod';

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
    private: z.boolean(),
  }),
  // epochs: z
  //   .number()
  //   .min(1, {
  //     message: 'Must train for at least 1 epoch',
  //   })
  //   .max(5, {
  //     message: 'Maximum training length is 5 epochs',
  //   }),
  wandbKey: z.string().nullable(),
  feature: z.string().nonempty({ message: 'Must select a feature' }),
});

export default function Tune() {
  // const [data, setData] = React.useState<Array<Object>>();
  const [datasets, setDatasets] = React.useState<
    Array<{ value: string; label: string; private: boolean }>
  >([]);
  const [features, setFeatures] = React.useState<Array<string>>([]);
  const [submissionData, setSubmissionData] =
    React.useState<Partial<z.infer<typeof formSchema>>>();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      baseModel: BASE_MODELS.FALCON,
      // epochs: 1,
      feature: '',
      dataset: undefined,
      wandbKey: null,
    },
  });
  const datasetWatch = form.watch('dataset');
  const isPrivateDataset = form.watch('dataset.private');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmissionData(values);

    const response = await fetch(
      `https://nealcorp--gpt-service-web.modal.run/train`,
      {
        method: 'POST',
        body: JSON.stringify({
          model_name: values.name,
          base_model_repo_id: values.baseModel,
          dataset_repo_id: values.dataset.id,
          dataset_feature: values.feature,
          wandb_key: values.wandbKey,
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const result = await response.json();
    return result;
  }

  React.useEffect(() => {
    const dataset = form.getValues('dataset');
    if (!dataset) return;

    if (!dataset.private) {
      getDatasetInfo(dataset.id).then((response) => {
        setFeatures(Object.keys(response.dataset_info.features));
      });
    }
  }, [datasetWatch]);

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
                    Object.keys(BASE_MODELS) as Array<keyof typeof BASE_MODELS>
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
              <Popover>
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
                            form.setValue('feature', '');
                            form.setValue('dataset', {
                              id: value,
                              private: dataset.private,
                            });
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
                  The key of the feature from the dataset to use for training
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
        {/* <FormField
          control={form.control}
          name="epochs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Epochs</FormLabel>
              <FormControl>
                <Input type="number" placeholder="3" {...field} />
              </FormControl>
              <FormDescription>How many epochs to train for</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        /> */}
        <FormField
          control={form.control}
          name="wandbKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>wandb API Key</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="abc-123"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>Weights and Biases API Key</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
      {/* <Table>
        <TableCaption>A list of your dataset.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Input</TableHead>
            <TableHead>Instruction</TableHead>
            <TableHead>Output</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.slice(0, 10) ?? []).map((row) => (
            <TableRow key={row.row_idx}>
              <TableCell className="font-medium">{row.row.input}</TableCell>
              <TableCell>{row.row.instruction}</TableCell>
              <TableCell>{row.row.output}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table> */}
    </Form>
  );
}
