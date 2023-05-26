import os
import time
from queue import Queue
from threading import Thread

import modal

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


# NOTE: The 3 functions below all run on an inference worker. load_deps must be the first fn called on the worker.
def load_monkeypatch_deps():
    import alpaca_lora_4bit.autograd_4bit
    from alpaca_lora_4bit.monkeypatch.peft_tuners_lora_monkey_patch import (
        replace_peft_model_with_int4_lora_model,
    )
    from peft import PeftModel

    alpaca_lora_4bit.autograd_4bit.use_new = True
    alpaca_lora_4bit.autograd_4bit.auto_switch = True

    replace_peft_model_with_int4_lora_model()


def load_model_and_lora(repo_id, model_path, lora=None):
    import torch
    from alpaca_lora_4bit.autograd_4bit import load_llama_model_4bit_low_ram
    from huggingface_hub import _CACHED_NO_EXIST, login, try_to_load_from_cache
    from huggingface_hub.constants import HUGGINGFACE_HUB_CACHE
    from peft import PeftModel

    login(os.environ["HUGGINGFACE_TOKEN"])

    filepath = try_to_load_from_cache(repo_id, filename=model_path)
    if filepath is _CACHED_NO_EXIST:
        # handle this case
        raise Exception("Model path does not exist")

    if not filepath:
        # raise Exception('Model path does not exist')
        download_model.call(repo_id)
        filepath = try_to_load_from_cache(repo_id, filename=model_path)

    model, tokenizer = load_llama_model_4bit_low_ram(repo_id, filepath, half=True)
    print("Loaded model and tokenizer for {}".format(repo_id))

    if lora:
        model = PeftModel.from_pretrained(
            model,
            lora,
            device_map={"": 0},
            torch_dtype=torch.float32,
        )
        print("{} Lora Applied.".format(lora))

    return model, tokenizer


class Iteratorize:

    """
    Transforms a function that takes a callback
    into a lazy iterator (generator).

    Adapted from: https://stackoverflow.com/a/9969000
    """

    def __init__(self, func, kwargs=None, callback=None):
        self.mfunc = func
        self.c_callback = callback
        self.q = Queue()
        self.sentinel = object()
        self.kwargs = kwargs or {}
        self.stop_now = False

        def _callback(val):
            self.q.put(val)

        def gentask():
            try:
                ret = self.mfunc(callback=_callback, **self.kwargs)
            except ValueError as e:
                print(e)
                pass
            except Exception as e:
                print(e)
                pass

            self.q.put(self.sentinel)
            if self.c_callback:
                self.c_callback(ret)

        self.thread = Thread(target=gentask)
        self.thread.start()

    def __iter__(self):
        return self

    def __next__(self):
        obj = self.q.get(True, None)
        if obj is self.sentinel:
            raise StopIteration
        else:
            return obj

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop_now = True


def inference(model, tokenizer, prompt):
    import torch
    import transformers

    class StreamAndStop(transformers.StoppingCriteria):
        def __init__(self, tokenizer, callback, stop="### Human:"):
            self.tokenizer = tokenizer
            self.callback = callback
            self.stop = stop

        def __call__(self, input_ids, *args, **kwargs) -> bool:
            prediction = self.tokenizer.decode(input_ids[0], skip_special_tokens=True)
            self.callback(prediction)
            return prediction.endswith(self.stop)

    generation_config = transformers.GenerationConfig(
        temperature=0.7, top_p=0.70, repetition_penalty=1 / 0.85
    )

    # Tokenize prompt and generate against the model
    batch = tokenizer(prompt, return_tensors="pt")

    start_ts = time.time()

    def gen(callback):
        # Generate response from model using stopping criteria to stream the output
        with torch.no_grad():
            out = model.generate(
                generation_config=generation_config,
                input_ids=batch["input_ids"].cuda(),
                attention_mask=torch.ones_like(batch["input_ids"]).cuda(),
                max_new_tokens=200,
                stopping_criteria=[StreamAndStop(tokenizer, callback)],
            )

    with Iteratorize(gen, None, None) as generator:
        for output in generator:
            yield output
