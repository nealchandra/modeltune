import os
from typing import Optional

import modal
from modal.cls import ClsMixin

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
class Inference(ClsMixin):
    def __init__(
        self,
        repo_id: str,
        model_path: str,
        lora: Optional[str] = None,
    ):
        self.repo_id = repo_id
        self.model_path = model_path

    def __enter__(self):
        from gpt.huggingface import HuggingfaceClient
        from gpt.llm import LlamaLLM

        self.llm = LlamaLLM()
        client = HuggingfaceClient(
            os.environ["HUGGINGFACE_TOKEN"], download_model_fn=download_model.call
        )
        self.llm.set_client(client)
        self.llm.load_model(self.repo_id, self.model_path)

    @modal.method(is_generator=True)
    def predict(self, prompt, generation_args={}, lora=None):
        from gpt.llm import GenerationArgs
        from peft import PeftModel

        if isinstance(self.llm.model, PeftModel):
            self.llm.remove_lora()

        if lora is not None:
            self.llm.apply_lora(lora)

        return self.llm.generate_streaming(generation_args, prompt)
