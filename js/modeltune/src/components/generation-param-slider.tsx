'use client';

import * as React from 'react';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@app/components/ui/hover-card';
import { Label } from '@app/components/ui/label';
import { Slider } from '@app/components/ui/slider';
import { SliderProps } from '@radix-ui/react-slider';
import { on } from 'events';
import { title } from 'process';

import { Input } from './ui/input';

interface GenerationParamSliderProps {
  min?: SliderProps['min'];
  max?: SliderProps['max'];
  step?: SliderProps['step'];
  defaultValue: SliderProps['defaultValue'];
  title: string;
  hoverText: string;
  onValueChange?: (value: number[] | undefined) => void;
}

export function GenerationParamSlider({
  min,
  max,
  step,
  defaultValue,
  title,
  hoverText,
  onValueChange,
}: GenerationParamSliderProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [inputText, setInputText] = React.useState(
    defaultValue?.[0].toString() ?? ''
  );

  const onInputSubmit = () => {
    let val = Number(inputText);
    if (val !== value?.[0]) {
      if (max && val > max) {
        val = Math.min(max, val);
      }
      if (min && val < min) {
        val = Math.max(min, val);
      }

      if (step && val % step !== 0) {
        val = Math.round(val / step) * step;
      }

      setValue([val]);
      setInputText(val.toString());
    }
  };

  React.useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  return (
    <div className="grid gap-2 pt-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={title.toLowerCase().replace(' ', '-')}>
                {title}
              </Label>
              <Input
                className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border"
                value={inputText}
                min={min}
                max={max}
                type="number"
                onChange={(e) => {
                  let val = Number(e.target.value);
                  setInputText(e.target.value);
                  if (
                    (max && val > max) ||
                    (min && val < min) ||
                    (step && val % step !== 0)
                  ) {
                    return;
                  }
                  setValue([val]);
                }}
                onBlur={onInputSubmit}
                onKeyDown={(e) => {
                  if (
                    e.nativeEvent.code === 'Enter' &&
                    e.target instanceof HTMLElement
                  ) {
                    e.target.blur();
                  }
                }}
              />
            </div>
            <Slider
              id={title.toLowerCase().replace(' ', '-')}
              min={min}
              max={max}
              defaultValue={value}
              step={step}
              value={value}
              onValueChange={(val) => {
                setValue(val);
                setInputText(val?.[0].toString() ?? '');
              }}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              aria-label={title}
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
