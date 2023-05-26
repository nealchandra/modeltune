from typing import TypedDict

import modal

from .inference import Inference


class InferenceFactory:
    def get_model_inference_stats(self, repo_id: str, model_path: str, lora=None):
        model_def = (repo_id, model_path, lora)

        cls = Inference.remote(repo_id, model_path, None)
        stats = cls.predict.get_current_stats()

        return stats

    def get_model_inference_fn(self, repo_id: str, model_path: str, lora=None):
        model_def = (repo_id, model_path, lora)
        cls = Inference.remote(repo_id, model_path, None)

        return cls.predict
