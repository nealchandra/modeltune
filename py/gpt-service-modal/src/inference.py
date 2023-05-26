import os
import time
from queue import Queue
from threading import Thread

import modal
from gpt.llm import LlamaLLm

from .common import cache_volume, stub
from .download import download_model


@stub.cls(
    **{
        "cloud": "gcp",
        "gpu": "A100",
        "image": stub.inference_image,
        "secret": modal.Secret.from_name("hf-secret"),
        "shared_volumes": {"/root/.cache/huggingface/hub": cache_volume},
        "concurrency_limit": 1,
        "container_idle_timeout": 200,
    }
)
class Inference:
    def __init__(self, repo_id, model_path, lora=None):
        self.repo_id = repo_id
        self.model_path = model_path
        self.lora = lora

    def __enter__(self):
        load_monkeypatch_deps()
        self.model, self.tokenizer = load_model_and_lora(
            self.repo_id, self.model_path, self.lora
        )

    @modal.method(is_generator=True)
    def predict(self, prompt, generation_args={}):
        return inference(self.model, self.tokenizer, prompt)
