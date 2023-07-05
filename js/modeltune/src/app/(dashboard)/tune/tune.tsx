'use client';

import * as React from 'react';

import { autocompleteDatasets, getDatasetInfo } from '../actions';
import { BASE_MODELS, BASE_MODEL_NAMES } from '../useModelPlayground';
import { Button } from '@app/components/ui/button';
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

function zodEnumFromObjKeys<K extends string>(
  obj: Record<K, any>
): z.ZodEnum<[K, ...K[]]> {
  const [firstKey, ...otherKeys] = Object.keys(obj) as K[];
  return z.enum([firstKey, ...otherKeys]);
}

const baseModelChoices = zodEnumFromObjKeys(BASE_MODELS);

const formSchema = z.object({
  name: z.string(),
  baseModel: zodEnumFromObjKeys(BASE_MODELS),
  dataset: z
    .object({
      id: z.string(),
      private: z.boolean(),
    })
    .nullable(),
  epochs: z
    .number()
    .min(1, {
      message: 'Must train for at least 1 epoch',
    })
    .max(5, {
      message: 'Maximum training length is 5 epochs',
    }),
  wandbKey: z.string().uuid().nullable(),
  feature: z.string(),
});

export default function ProfileForm() {
  // const [data, setData] = React.useState<Array<Object>>();
  const [datasets, setDatasets] = React.useState<
    Array<{ value: string; label: string; private: boolean }>
  >([]);
  const [features, setFeatures] = React.useState<Array<string>>([]);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      epochs: 1,
      feature: '',
      dataset: null,
      wandbKey: null,
    },
  });
  const datasetWatch = form.watch('dataset');
  const isPrivateDataset = form.watch('dataset.private');

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
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

  const [ref, setRef] = React.useState<HTMLInputElement | null>(null);

  const updateDatasets = (e: Event) =>
    autocompleteDatasets(e.target!.value).then((resp) => {
      setDatasets(resp);
    });

  const updateDatasetsDebounced = React.useCallback(
    debounce(updateDatasets, 200),
    []
  );

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
                      onInputCapture={updateDatasetsDebounced}
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
        <FormField
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
        />
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
