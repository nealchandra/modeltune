import time

import alpaca_lora_4bit.autograd_4bit
import torch
import transformers
from alpaca_lora_4bit.autograd_4bit import load_llama_model_4bit_low_ram
from alpaca_lora_4bit.monkeypatch.peft_tuners_lora_monkey_patch import (
    replace_peft_model_with_int4_lora_model,
)
from peft import PeftModel

alpaca_lora_4bit.autograd_4bit.use_new = True
alpaca_lora_4bit.autograd_4bit.auto_switch = True

replace_peft_model_with_int4_lora_model()


def load_model_and_lora(repo_id, model_path, lora=None):
    model, tokenizer = load_llama_model_4bit_low_ram(repo_id, model_path, half=True)
    print("Loaded model and tokenizer for {}".format(repo_id))
    if lora:
        model = PeftModel.from_pretrained(
            model, lora, device_map={"": 0}, torch_dtype=torch.float32
        )
        print("{} Lora Applied.".format(lora))

    return model, tokenizer


def inference(model, tokenizer, prompt, stop_sequence=None):
    class StopConversation(transformers.StoppingCriteria):
        def __init__(self, tokenizer):
            self.tokenizer = tokenizer

        def __call__(self, input_ids, scores) -> bool:
            # exit if the model generates a prompt which contains "### Human:", indicating the
            # model is erroneously hallucinating a human response
            return self.tokenizer.decode(
                input_ids[0], skip_special_tokens=True
            ).endswith(stop_sequence)

    generation_config = transformers.GenerationConfig(
        temperature=0.7, top_p=0.70, repetition_penalty=1 / 0.85
    )

    # Tokenize prompt and generate against the model
    batch = tokenizer(prompt, return_tensors="pt")

    start_ts = time.time()

    generation_kwargs = {
        "input_ids": batch["input_ids"].cuda(),
        "attention_mask": torch.ones_like(batch["input_ids"]).cuda(),
        "max_new_tokens": 1024,
        "generation_config": generation_config,
    }

    if stop_sequence:
        generation_kwargs["stopping_criteria"] = [
            StopConversation(tokenizer),
        ]

    # Generate response from model using stopping criteria to stream the output
    with torch.no_grad():
        out = model.generate(**generation_kwargs)

        #  Send reply back to client
        out_raw = out[0]
        total_time = time.time() - start_ts
        token_per_sec = len(out_raw) / total_time

        prediction = tokenizer.decode(out_raw, skip_special_tokens=True)

        print(f"{prediction}")
        print(
            f"Generated {len(out_raw)} tokens in {total_time:.2f} seconds ({token_per_sec:.2f} tokens/sec)"
        )

        return prediction
