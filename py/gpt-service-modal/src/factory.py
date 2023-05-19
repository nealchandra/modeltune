from typing import TypedDict

import modal

from .inference import Inference


class InferenceFactory:
    def __init__(self):
        self.model_map: dict[tuple, str] = {}

    def get_model_inference_fn(self, repo_id: str, model_path: str, lora=None):
        model_def = (repo_id, model_path, lora)
        cls = self.model_map.get(model_def)

        if not cls:
            cls = Inference.remote(repo_id, model_path)

        return cls.predict