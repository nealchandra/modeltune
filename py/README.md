The py directory currently contains 2 modules which can be run together with docker compose:

1. llm-api, a generic FastAPI project which exposes some simple endpoints to trigger inferences. These tasks are then enqueued using Celery.
2. gpt, a python worker which pulls Celery tasks and runs inferences against an int4 quantized local model. Currently this is using [vicuna](https://github.com/lm-sys/FastChat)

Note the 2 projects have no direct dependencies, they are built and run separately, and only communicate via Celery backed by local redis.

## Setup

To run:

0. Download the model(s) to run into a local folder. Modify the .env file to use a different model.
1. MODELS_DIR=/path/to/models docker compose up
