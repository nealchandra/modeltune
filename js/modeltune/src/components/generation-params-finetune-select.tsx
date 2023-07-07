import * as React from 'react';

import {
  BASE_MODELS,
  BASE_MODEL_NAMES,
} from '@app/app/(dashboard)/useModelPlayground';
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

interface GenerationParamModelSelectProps {
  title: string;
  hoverText: string;
  finetune: string | undefined;
  choices: string[];
  onValueChange?: (value: string) => void;
}

export function GenerationParamFinetuneSelect({
  title,
  hoverText,
  finetune,
  choices,
  onValueChange,
}: GenerationParamModelSelectProps) {
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
            <Select
              onValueChange={(val: BASE_MODELS) => onValueChange?.(val)}
              value={finetune}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select finetune" />
              </SelectTrigger>
              <SelectContent>
                {choices.map((finetune) => (
                  <SelectItem key={finetune} value={finetune}>
                    {finetune}
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
