'use client';

import * as React from 'react';

import { GenerationParamInput } from '@app/components/generation-param-input';
import { GenerationParamSlider } from '@app/components/generation-param-slider';
import { Icons } from '@app/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { Button } from '@app/components/ui/button';
import { ContentEditableDiv } from '@app/components/ui/content-editable-div';

import { GenerationParams, useModelPlayground } from './useModelPlayground';

export const Editor = () => {
  const [generationParams, setGenerationParams] =
    React.useState<GenerationParams>({
      repoId: 'TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g',
      modelPath: 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors',
      temperature: 0.7,
      maxTokens: 256,
      stoppingSequence: '### Human:',
    });
  const { html, onChange, onSubmit, onCancel } =
    useModelPlayground(generationParams);

  return (
    <div>
      <Alert className="my-5">
        <AlertTitle>Known Issues</AlertTitle>
        <AlertDescription>
          * At the moment, there is no way for me to check whether the remote
          GPU is warmed up, so the first request will be slow without any clear
          indication.
        </AlertDescription>
        <AlertDescription>
          * The cancel button will cancel the streaming on the client, but atm
          there is an issue where the server will continue to generate the
          response, meaning the next request will be delayed regardless.
        </AlertDescription>
      </Alert>
      <div className="grid gap-12 grid-cols-[1fr_300px]">
        <ContentEditableDiv
          value={html}
          onChange={(e) => onChange(e.target.value)}
          style={{
            whiteSpace: 'pre-wrap',
            display: 'inline-block',
          }}
          className="editor my-2 min-h-[400px] flex-1 p-4 md:min-h-[700px] lg:min-h-[700px]"
        />
        <div>
          <GenerationParamSlider
            title="Temperature"
            hoverText="Controls the randomness of the generated text. Lower values make the model more predictable."
            min={0.1}
            max={1}
            step={0.1}
            defaultValue={[generationParams.temperature]}
            onValueChange={(value) => {
              setGenerationParams({
                ...generationParams,
                temperature: value?.[0] ?? generationParams.temperature,
              });
            }}
          />
          <GenerationParamSlider
            title="Max Length"
            hoverText="The maximum number of tokens to generate. Requests can use up to 2,048, shared between prompt and completion."
            min={1}
            max={2048}
            step={1}
            defaultValue={[generationParams.maxTokens]}
            onValueChange={(value) => {
              setGenerationParams({
                ...generationParams,
                maxTokens: value?.[0] ?? generationParams.maxTokens,
              });
            }}
          />
          <GenerationParamInput
            title="Stopping sequence"
            hoverText="If the model generates this sequence, it will stop, allowing the generation to terminate at an appropriate time."
            defaultValue={generationParams.stoppingSequence}
            onValueChange={(value) => {
              setGenerationParams({
                ...generationParams,
                stoppingSequence: value ?? generationParams.stoppingSequence,
              });
            }}
          />
        </div>
      </div>
      <Button size="sm" className="mr-1" onClick={onSubmit}>
        <span>Submit</span>
      </Button>
      <Button size="sm" className="mx-1" variant="secondary" onClick={onCancel}>
        <span>Cancel</span>
      </Button>
    </div>
  );
};
