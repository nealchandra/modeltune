import * as React from 'react';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@app/components/ui/hover-card';
import { Label } from '@app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';

type ModelDefinition = Record<string, string>;

interface GenerationParamModelSelectProps<T extends ModelDefinition> {
  title: string;
  hoverText: string;
  choices: T;
  model: string;
  onValueChange?: (value: keyof T) => void;
}

export function GenerationParamModelSelect<T extends ModelDefinition>({
  title,
  hoverText,
  choices,
  model,
  onValueChange,
}: GenerationParamModelSelectProps<T>) {
  return (
    <div className="grid gap-2 pt-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={title.toLowerCase().replace(' ', '-')}>
                {title}
              </Label>
            </div>
            <Select onValueChange={onValueChange} value={model}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select base model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(choices).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-[260px] text-sm"
          side="left"
        >
          {hoverText}
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
