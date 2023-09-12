### Modeltune

https://github.com/nealchandra/modeltune/assets/808580/d90fab1b-c074-47dc-9682-7ae252610cf6

Modeltune is a platform for easily finetuning LLMs and performing inference against your custom models. No specialized hardware or custom training code required.

Modeltune has two views -- a playground and a training view. Load any public dataset (or connect your HuggingFace API key to access private resources) from Hugging Face, configure the prompt template for your use case using an inline Handlebars editor, and begin a training job. Finetunes run on Modal and will automatically save training logs and data to wandb if you have connected your account. Once a training job is complete, you can perform inference against your model in the playground.

(Coming soon) Once you're satisfied with your model, you can integrate into your applications via a custom inference API.

Requirements:

- [Install Infisical CLI](https://infisical.com/docs/documentation/getting-started/cli)
- [Install pnpm](https://pnpm.io/installation)

Run:

- `docker compose up -d`
- `cd js` and `pnpm install`
- `inifiscal run pnpm nx dev modeltune`
