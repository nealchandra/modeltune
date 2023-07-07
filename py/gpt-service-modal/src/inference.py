import os
import shutil
from typing import Optional

import modal
from modal.cls import ClsMixin

from .common import finetunes_volume, models_volume, stub
from .download import download_model


@stub.cls(
    cloud="gcp",
    gpu="A100",
    image=stub.inference_image,
    secret=modal.Secret.from_name("hf-secret"),
    shared_volumes={
        "/models": models_volume,
        "/finetunes": finetunes_volume,
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
        from gpt.llm import LLM

        # download model
        model_path = f"/models/{self.repo_id.replace('/', '--')}"
        if not os.path.exists(model_path):
            download_model(
                self.repo_id, local_dir=model_path, local_dir_use_symlinks=False
            )

        self.llm = LLM()
        self.llm.load_model(model_path)

    @modal.method()
    def train(
        self,
        dataset_repo_id: str,
        dataset_feature: str,
        output_name: str,
        wandb_key: Optional[str] = None,
    ):
        import wandb

        dataset_path = f"/models/datasets/{dataset_repo_id.replace('/', '--')}"
        if not os.path.exists(dataset_path):
            download_model(
                dataset_repo_id,
                repo_type="dataset",
                local_dir=dataset_path,
                local_dir_use_symlinks=False,
            )

        wandb.login(key=wandb_key)
        self.llm.train(
            dataset_path,
            dataset_feature,
            f"/finetunes/{output_name}",
            {"report_to_wandb": wandb_key is not None},
        )

    @modal.method(is_generator=True)
    def predict(self, prompt, generation_args={}, lora=None):
        from gpt.llm import GenerationArgs
        from peft import PeftModel

        if isinstance(self.llm.model, PeftModel):
            self.llm.remove_lora()

        if lora is not None:
            lora_path = f"/finetunes/{self.repo_id.replace('/', '--')}/{lora.replace('/', '--')}"
            self.llm.apply_lora(lora_path)

        return self.llm.generate_streaming(generation_args, prompt)
