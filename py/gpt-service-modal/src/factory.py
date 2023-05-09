import modal
from typing import TypedDict

from .inference import load_monkeypatch_deps, load_model_and_lora, inference

class InferenceFactory:
    def __init__(self, stub: modal.Stub, cls_params: dict):
        self.stub = stub
        self.cls_params = cls_params
        self.model_map: dict[tuple, str] = {}

    def get_model_inference_fn(self, repo_id: str, model_path: str, lora=None):
        model_def = (repo_id, model_path, lora)
        cls = self.model_map.get(model_def)

        if not cls:
            @self.stub.cls(**self.cls_params, serialized=True)
            class c():
                def __enter__(self):
                    load_monkeypatch_deps()
                    self.model, self.tokenizer = load_model_and_lora(repo_id, model_path, lora)

                @modal.method()
                def prompt(self, prompt):
                    return inference(model=self.model, tokenizer=self.tokenizer, prompt=prompt)
            cls = c
            self.model_map[model_def] = cls

        return cls.prompt