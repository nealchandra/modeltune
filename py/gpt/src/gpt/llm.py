import os
import time
from typing import Literal, Optional, TypedDict

import alpaca_lora_4bit.autograd_4bit
import torch
from alpaca_lora_4bit.autograd_4bit import load_llama_model_4bit_low_ram
from alpaca_lora_4bit.monkeypatch.peft_tuners_lora_monkey_patch import (
    replace_peft_model_with_int4_lora_model,
)
from huggingface_hub import _CACHED_NO_EXIST, login, try_to_load_from_cache
from huggingface_hub.constants import HUGGINGFACE_HUB_CACHE
from peft import PeftModel
from transformers import (
    GenerationConfig,
    LlamaForCausalLM,
    LlamaTokenizer,
    StoppingCriteria,
)

from .huggingface import HuggingfaceClient

alpaca_lora_4bit.autograd_4bit.use_new = True
alpaca_lora_4bit.autograd_4bit.auto_switch = True

from . import utils

replace_peft_model_with_int4_lora_model()


class GenerationArgs(TypedDict):
    top_p: Optional[float]
    top_k: Optional[int]
    temperature: Optional[float]
    repetiton_penalty: Optional[float]
    stopping_sequence: Optional[str]


class LlamaLLM:
    model_type: Literal["Llama"] = "Llama"
    client: Optional[HuggingfaceClient]
    model: Optional[LlamaForCausalLM]
    tokenizer: Optional[LlamaTokenizer]

    def set_client(self, client: HuggingfaceClient):
        self.client = client

    def load_model(self, repo_id: str, model_path: str):
        if not self.client:
            raise Exception("Client not set")

        filepath = try_to_load_from_cache(repo_id, filename=model_path)
        if filepath is _CACHED_NO_EXIST:
            # handle this case
            raise Exception("Model path does not exist")

        if not filepath:
            # raise Exception('Model path does not exist')
            self.client.download_model(repo_id)
            filepath = try_to_load_from_cache(repo_id, filename=model_path)
        self.model, self.tokenizer = load_llama_model_4bit_low_ram(
            repo_id, filepath, half=True
        )

    def apply_lora(self, lora: str):
        if not self.model:
            raise Exception("Model not loaded")

        if not self.client:
            raise Exception("Client not set")

        filepath = try_to_load_from_cache(lora, filename='adapter_config.json')
        if not filepath:
            self.client.download_model(lora)

        login(self.client.token)
        self.model = PeftModel.from_pretrained(
            self.model,
            lora,
            device_map={"": 0},
            torch_dtype=torch.float32,
            cache_dir=self.client.cache_dir,
            use_auth_token=self.client.token,
        )
        print("{} Lora Applied.".format(lora))

    def remove_lora(self):
        if not self.model:
            raise Exception("Model not loaded")

        self.model = PeftModel.get_base_model(self.model)

    def generate_streaming(self, generation_config: GenerationArgs, prompt: str):
        generation_config = GenerationConfig(**{
            'temperature': 0.7,
            'top_p': 0.70,
            'repetition_penalty': 1 / 0.85,
            **generation_config,
        })

        # Tokenize prompt and generate against the model
        batch = self.tokenizer(prompt, return_tensors="pt")

        start_ts = time.time()

        def gen(callback):
            # Generate response from model using stopping criteria to stream the output
            with torch.no_grad():
                out = self.model.generate(
                    generation_config=generation_config,
                    input_ids=batch["input_ids"].cuda(),
                    attention_mask=torch.ones_like(batch["input_ids"]).cuda(),
                    max_new_tokens=200,
                    stopping_criteria=[
                        utils.StreamAndStop(
                            self.tokenizer,
                            callback,
                            stop=generation_config.stopping_sequence or "### Human:",
                        )
                    ],
                )

        with utils.Iteratorize(gen, None, None) as generator:
            for output in generator:
                yield output
