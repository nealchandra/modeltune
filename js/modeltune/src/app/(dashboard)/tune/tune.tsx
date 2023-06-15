'use client';

import * as React from 'react';

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
import { Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string(),
  dataset: z.string(),
  epochs: z
    .number()
    .min(1, {
      message: 'Must train for at least 1 epoch',
    })
    .max(5, {
      message: 'Maximum training length is 5 epochs',
    }),
  wandbKey: z.string().uuid(),
});

const datasets = [{ value: 'tatsu-lab/alpaca', label: 'tatsu-lab/alpaca' }];

export default function ProfileForm() {
  const [data, setData] = React.useState<Array<Object>>();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // defaultValues: {
    //   username: '',
    // },
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  React.useEffect(() => {
    async function query() {
      const response = await fetch(
        'https://datasets-server.huggingface.co/first-rows?dataset=tatsu-lab%2Falpaca&config=tatsu-lab--alpaca&split=train',
        {
          headers: {
            Authorization: `Bearer ${'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'}`,
          },
          method: 'GET',
        }
      );
      const result = await response.json();
      return result;
    }
    query().then((response) => {
      console.log(response);
      setData(response.rows);
    });
  }, []);

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
                        'w-[200px] justify-between',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value
                        ? datasets.find(
                            (dataset) => dataset.value === field.value
                          )?.label
                        : 'Select dataset'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Enter dataset name..." />
                    <CommandEmpty>No dataset found.</CommandEmpty>
                    <CommandGroup>
                      {datasets.map((dataset) => (
                        <CommandItem
                          value={dataset.value}
                          key={dataset.value}
                          onSelect={(value) => {
                            form.setValue('dataset', value);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              dataset.value === field.value
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
                <Input type="number" placeholder="abc-123" {...field} />
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
