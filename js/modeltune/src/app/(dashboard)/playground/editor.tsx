'use client';

import * as React from 'react';

import {
  BASE_MODELS,
  GenerationParams,
  useModelPlayground,
} from '../useModelPlayground';
import { GenerationParamInput } from '@app/components/generation-param-input';
import { GenerationParamSlider } from '@app/components/generation-param-slider';
import { GenerationParamFinetuneSelect } from '@app/components/generation-params-finetune-select';
import { GenerationParamModelSelect } from '@app/components/generation-params-model-select';
import { Icons } from '@app/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { Button } from '@app/components/ui/button';
import { ContentEditableDiv } from '@app/components/ui/content-editable-div';

export const Editor = () => {
  const [finetunes, setFinetunes] = React.useState<string[]>([]);
  const [generationParams, setGenerationParams] =
    React.useState<GenerationParams>({
      repoId: BASE_MODELS.FALCON,
      lora: undefined,
      temperature: 0.7,
      topP: 0.7,
      maxTokens: 256,
      stoppingSequence: '### Human:',
    });
  const { html, onChange, onSubmit, onCancel } =
    useModelPlayground(generationParams);

  React.useEffect(() => {
    const updateFinetunes = async () => {
      const resp = await fetch(
        `https://nealcorp--gpt-service-web.modal.run/finetunes?base_model_repo_id=${generationParams.repoId}`,
        { method: 'GET' }
      );
      const json = await resp.json();
      console.log(json);
      setFinetunes(json);
    };
    updateFinetunes();
  }, [generationParams.repoId]);

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
          <GenerationParamModelSelect
            title="Base Model"
            hoverText="The model to use for generation."
            model={generationParams.repoId}
            onValueChange={(value) => {
              setGenerationParams({
                ...generationParams,
                repoId: value,
              });
            }}
          />
          <GenerationParamFinetuneSelect
            title="Finetune"
            hoverText="The finetune adapter to use for generation."
            choices={finetunes}
            finetune={generationParams.lora}
            onValueChange={(value) => {
              setGenerationParams({
                ...generationParams,
                lora: value,
              });
            }}
          />
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
            title="Top P"
            hoverText="If set to float < 1, only the smallest set of most probable tokens with probabilities that add up to
            `top_p` or higher are kept for generation."
            min={0.05}
            max={1}
            step={0.01}
            defaultValue={[generationParams.topP]}
            onValueChange={(value) => {
              setGenerationParams({
                ...generationParams,
                topP: value?.[0] ?? generationParams.topP,
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
