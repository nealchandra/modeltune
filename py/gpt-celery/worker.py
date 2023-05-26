import os
import sys
import time
from pathlib import Path
from typing import TypedDict, List, Literal

from celery import Celery

import torch
import transformers

import time
import torch

from peft import PeftModel
import alpaca_lora_4bit.autograd_4bit
from alpaca_lora_4bit.autograd_4bit import load_llama_model_4bit_low_ram, Autograd4bitQuantLinear
from alpaca_lora_4bit.monkeypatch.peft_tuners_lora_monkey_patch import replace_peft_model_with_int4_lora_model
from alpaca_lora_4bit.models import Linear4bitLt
from alpaca_lora_4bit.amp_wrapper import AMPWrapper


replace_peft_model_with_int4_lora_model()

celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379")

CONFIG_PATH = f'/usr/models/{os.environ["CONFIG_PATH"]}'
MODEL_PATH = f'/usr/models/{os.environ["MODEL_PATH"]}'

PEFT_RELATIVE_PATH = os.environ.get("LORA_PATH", None)
PEFT_PATH = f'/usr/models/{PEFT_RELATIVE_PATH}' if PEFT_RELATIVE_PATH else None

model, tokenizer = load_llama_model_4bit_low_ram(CONFIG_PATH, MODEL_PATH)

if PEFT_PATH:
    model = PeftModel.from_pretrained(model, PEFT_PATH, device_map={'': 0}, torch_dtype=torch.float32)
    print('{} Lora Applied.'.format(PEFT_PATH))

print('Apply auto switch and half')

model.half()
wrapper = AMPWrapper(model)
wrapper.apply_generate()

for n, m in model.named_modules():
    if isinstance(m, Autograd4bitQuantLinear) or isinstance(m, Linear4bitLt):
        if m.is_v1_model:
            m.zeros = m.zeros.half()
        m.scales = m.scales.half()
        m.bias = m.bias.half()
alpaca_lora_4bit.autograd_4bit.use_new = True
alpaca_lora_4bit.autograd_4bit.auto_switch = True

print("Model loaded. Ready to receive prompts.")

class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str


@celery.task(name="inference")
def inference(messages: List[Message]):
    # handle system prompt
    prompt = ""
    if messages[0]['role'] == 'System':
        sys_prompt = messages.pop(0)['content']
        prompt += f'{sys_prompt} ###\n'

    prompt += ''.join(f"### {m['role']}: {m['content']} \n" for m in messages)
    prompt += """
### Assistant:"""
    print(prompt)
    prediction = run_inference(prompt)
    return prediction

def run_inference(prompt):
    generation_config = transformers.GenerationConfig(
        temperature=0.7,
        top_p=0.70,
        repetition_penalty=1/0.85
    )

    # Tokenize prompt and generate against the model
    batch = tokenizer(prompt, return_tensors="pt")

    start_ts = time.time()

    # Generate response from model using stopping criteria to stream the output
    with torch.no_grad():
        out = model.generate(
            generation_config=generation_config,
            input_ids=batch["input_ids"].cuda(),
            attention_mask=torch.ones_like(batch["input_ids"]).cuda(),
            max_new_tokens=1024,
            stopping_criteria=[StopConversation(tokenizer)]
        )

        #  Send reply back to client
        out_raw = out[0]
        total_time = time.time() - start_ts
        token_per_sec = len(out_raw) / total_time
        
        prediction = tokenizer.decode(out_raw, skip_special_tokens=True)
        
        print(f'{prediction}')
        print(f'Generated {len(out_raw)} tokens in {total_time:.2f} seconds ({token_per_sec:.2f} tokens/sec)')

        return prediction

class StopConversation(transformers.StoppingCriteria):
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer

    def __call__(self, input_ids, scores) -> bool:
        # exit if the model generates a prompt which contains "### Human:", indicating the 
        # model is erroneously hallucinating a human response
        return tokenizer.decode(input_ids[0], skip_special_tokens=True).endswith("### Human:")