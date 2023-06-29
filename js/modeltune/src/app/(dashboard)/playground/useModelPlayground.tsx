'use client';

import * as React from 'react';

import sanitizeHtml from 'sanitize-html';

const TEMPLATE_TEXT = `You are a helpful AI assistant ###
### Human: What is a llama?
### Assistant:
`;

type EditorProps = {
  prompt: string;
};

export type GenerationParams = {
  repoId: keyof typeof BASE_MODELS;
  lora?: string;

  temperature: number;
  maxTokens: number;
  topP: number;

  stoppingSequence: string;
};

export const BASE_MODELS = {
  'tiiuae/falcon-7b-instruct': 'Falcon 7B Instruct',
  'TheBloke/Wizard-Vicuna-13B-Uncensored-HF': 'Vicuna 13B',
};

const BASE_TEMPLATES = {
  'tiiuae/falcon-7b-instruct': `You are a helpful AI assistant
Human: What is a llama?
Assistant:`,
  'TheBloke/Wizard-Vicuna-13B-Uncensored-HF': `You are a helpful AI assistant ###
### Human: What is a llama?
### Assistant:`,
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
    });
    const prompt = `${html}`.replace('<mark>', '').replace('</mark>', '');

    const options = {
      method: 'POST',
      body: JSON.stringify({
        repo_id: repoId,
        // lora: 'nealchandra/vicuna-13b-lora-lt-full',
        content: prompt,
        generation_args: {
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stopping_sequence: stoppingSequence,
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    };

    submit(options, prompt);
  }, [repoId, lora, html]);

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
