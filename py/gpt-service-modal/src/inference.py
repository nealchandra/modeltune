import os
import shutil
from typing import Optional

import modal
from modal.cls import ClsMixin

from .common import models_volume, stub
from .download import download_model


@stub.cls(
    cloud="gcp",
    gpu="A100",
    image=stub.inference_image,
    secret=modal.Secret.from_name("hf-secret"),
    shared_volumes={
        "/models": models_volume,
    },
    concurrency_limit=1,
    container_idle_timeout=300,
)
class Inference(ClsMixin):
    def __init__(
        self,
        repo_id: str,
        lora: Optional[str] = None,
    ):
        self.repo_id = repo_id

    def __enter__(self):
        from gpt.llm import LlamaLLM

        # download model
        model_path = f"/models/{self.repo_id.replace('/', '--')}"
        if not os.path.exists(model_path):
            download_model(
                self.repo_id, local_dir=model_path, local_dir_use_symlinks=False
            )

        self.llm = LlamaLLM()
        self.llm.load_model(model_path)

    @modal.method()
    def train(self):
        dataset_path = f"/models/datasets/{'Abirate/english_quotes'.replace('/', '--')}"
        if not os.path.exists(dataset_path):
            download_model(
                "Abirate/english_quotes",
                repo_type="dataset",
                local_dir=dataset_path,
                local_dir_use_symlinks=False,
            )

        self.llm.train(dataset_path, "/models/finetunes")

        print(os.listdir("/models/finetunes"))

    @modal.method(is_generator=True)
    def predict(self, prompt, generation_args={}, lora=None):
        from gpt.llm import GenerationArgs
        from peft import PeftModel

        if isinstance(self.llm.model, PeftModel):
            self.llm.remove_lora()

        if lora is not None:
            self.llm.apply_lora(lora)

        return self.llm.generate_streaming(generation_args, prompt)
