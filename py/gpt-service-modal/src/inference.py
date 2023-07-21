import os
import shutil
from typing import Optional

import modal
from modal.cls import ClsMixin

from .common import finetunes_volume, models_volume, stub
from .download import download_model
from .inngest import Inngest


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
    container_idle_timeout=180,
    timeout=60 * 60 * 24,  # training takes a long time
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

    @modal.method()  # training jobs can take a long time
    def train(
        self,
        dataset_repo_id: str,
        prompt_template: str,
        output_name: str,
        job_data,
    ):
        import wandb

        wandb_key = job_data.get("wandb_key", None)

        dataset_path = f"/models/datasets/{dataset_repo_id.replace('/', '--')}"
        if not os.path.exists(dataset_path):
            download_model(
                dataset_repo_id,
                repo_type="dataset",
                local_dir=dataset_path,
                local_dir_use_symlinks=False,
            )

        if wandb_key:
            wandb.login(key=wandb_key)

        inngest = Inngest(job_data["job_id"], job_data["env"])

        self.llm.train(
            dataset_path,
            prompt_template,
            f"/finetunes/{output_name}",
            on_log=lambda l: inngest.post_log(l),
            on_step=lambda s: inngest.post_step(s),
            train_args={"report_to_wandb": wandb_key is not None},
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
