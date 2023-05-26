'use client';

import * as React from 'react';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@app/components/ui/hover-card';
import { Label } from '@app/components/ui/label';

import { Input } from './ui/input';

interface GenerationParamInputProps {
  defaultValue: string;
  title: string;
  hoverText: string;
  onValueChange?: (value: string | undefined) => void;
}

export function GenerationParamInput({
  defaultValue,
  title,
  hoverText,
  onValueChange,
}: GenerationParamInputProps) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  return (
    <div className="grid gap-2 pt-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid">
            <div className="flex items-center justify-between min-h-[50px]">
              <Label htmlFor={title.toLowerCase().replace(' ', '-')}>
                {title}
              </Label>
            </div>
            <Input
              className="w-100% rounded-md border px-2 py-5 text-sm text-muted-foreground hover:border-border"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                onValueChange?.(e.target.value);
              }}
            />
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
