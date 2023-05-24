'use client';

import * as React from 'react';

const TEMPLATE_TEXT = `You are a helpful AI assistant ###
### Human: 
`;

type EditorProps = {
  prompt: string;
};

type ModelPlaygroundParams = {
  repoId?: string;
  modelPath?: string;
  lora?: string;
};

export const useModelPlayground = ({
  repoId = 'TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g',
  modelPath = 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors',
  lora,
}: ModelPlaygroundParams): {
  html: string;
  onChange: (html: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
} => {
  const [html, setHtml] = React.useState(TEMPLATE_TEXT);

  const url = 'https://nealcorp--gpt-service-web.modal.run/generate';
  const [controller, setController] = React.useState(new AbortController());

  const submit = async (options: RequestInit, initial?: string) => {
    const controller = new AbortController();
    setController(controller);

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

        const prediction = decoder.decode(value);

        if (initial) {
          const [_, newTokens] = prediction.split(initial);
          setHtml(`${initial}<mark>${newTokens}</mark>`);
        } else {
          setHtml(`<mark>${prediction}</mark>`);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // setState(prevState => ({ ...prevState, ...{ error: err } }));
      }
    }
  };

  // reset on model change
  React.useEffect(() => {
    setHtml(TEMPLATE_TEXT);
  }, [repoId, modelPath, lora]);

  // clear marked text regex and set html
  const onChange = React.useCallback((html: string) => {
    setHtml(html.replace('<mark>', '').replace('</mark>', ''));
  }, []);

  const onSubmit = React.useCallback(() => {
    console.log(html);
    const prompt = `${html}`.replace('<mark>', '').replace('</mark>', '');

    const options = {
      method: 'POST',
      body: JSON.stringify({
        repo_id: 'TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g',
        model_path: 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors',
        lora,
        content: prompt,
      }),
      headers: { 'Content-Type': 'application/json' },
    };

    submit(options, prompt);
  }, [repoId, modelPath, lora, html]);

  return {
    html,
    onChange,
    onSubmit,
    onCancel: () => controller.abort(),
  };
};
