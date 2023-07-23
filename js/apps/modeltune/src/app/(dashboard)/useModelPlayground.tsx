'use client';

import * as React from 'react';

import sanitizeHtml from 'sanitize-html';

const TEMPLATE_TEXT = `You are a literary AI assistant specializing in erotic short stories ###
### Human: Write an excerpt from erotic short story about a loving couple
### Assistant:`;

type EditorProps = {
  prompt: string;
};

export type GenerationParams = {
  repoId: BASE_MODELS;
  lora?: string;

  temperature: number;
  maxTokens: number;
  topP: number;

  stoppingSequence: string;
};

export enum BASE_MODELS {
  LLAMA2 = 'meta-llama/Llama-2-7b-hf',
}

export const BASE_MODEL_NAMES: { [key in BASE_MODELS]: string } = {
  [BASE_MODELS.LLAMA2]: 'Llama-2 7B',
};

const BASE_TEMPLATES: { [key in BASE_MODELS]: string } = {
  [BASE_MODELS.LLAMA2]: `You are a helpful AI assistant
User: What is a llama?
Assistant:`,
};

export const useModelPlayground = ({
  repoId,
  lora,
  temperature,
  maxTokens,
  topP,
  stoppingSequence,
}: GenerationParams): {
  html: string;
  onChange: (html: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
} => {
  const [html, setHtml] = React.useState(TEMPLATE_TEXT);

  // const [fnId, setFnId] = React.useState();
  const url = 'https://nealcorp--gpt-service-web.modal.run/generate';
  const [controller, setController] = React.useState(new AbortController());

  const submit = async (options: RequestInit, initial?: string) => {
    const controller = new AbortController();
    setController(controller);
    // setFnId(undefined);

    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        throw resp.statusText;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        // const fnId = resp.headers.get('Modal-Call-Id');
        // setFnId(fnId);

        const prediction = decoder.decode(value);
        if (initial) {
          const [_, newTokens] = prediction.split(initial);
          setHtml(`${initial}<mark>${newTokens}</mark>`);
        } else {
          setHtml(`<mark>${prediction}</mark>`);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // setState(prevState => ({ ...prevState, ...{ error: err } }));
      }
    }
  };

  // reset on model change
  React.useEffect(() => {
    setHtml(BASE_TEMPLATES[repoId]);
  }, [repoId, lora]);

  // clear marked text regex and set html
  const onChange = React.useCallback((html: string) => {
    setHtml(html.replace(/<mark>/g, '').replace(/<\/mark>/g, ''));
  }, []);

  const onSubmit = React.useCallback(() => {
    const sanitized = sanitizeHtml(html, {
      allowedTags: [],
      selfClosing: ['br'],
    });
    setHtml(sanitized);

    const options = {
      method: 'POST',
      body: JSON.stringify({
        repo_id: repoId,
        lora: lora,
        content: sanitized,
        generation_args: {
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stopping_sequence: stoppingSequence,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    };

    submit(options, sanitized);
  }, [repoId, lora, html, temperature, maxTokens, topP, stoppingSequence]);

  const onCancel = React.useCallback(async () => {
    controller.abort();
    // await fetch(
    //   `https://nealcorp--gpt-service-web.modal.run/generation/${fnId}`,
    //   { method: 'DELETE' }
    // );
  }, [controller /* fnId */]);

  return {
    html,
    onChange,
    onSubmit,
    onCancel,
  };
};
