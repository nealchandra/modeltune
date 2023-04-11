import os
import sys
import time
from pathlib import Path
from typing import TypedDict, List, Literal

from celery import Celery

import torch
import transformers

sys.path.insert(0, os.path.join(os.path.dirname( __file__ ), str(Path("./repositories/GPTQ-for-LLaMa"))))
import llama

celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379")



def load_model(model_path, checkpoint, int4):
    if int4:
        model = load_quantized(model_path, checkpoint)
    else:
        model = transformers.LlamaForCausalLM.from_pretrained(model_path, load_in_8bit=True, device_map='auto')
        model = PeftModel.from_pretrained(model, checkpoint, device_map={'': 0})
    return model

def load_quantized(model_path, pt_path):
    load_quant = llama.load_quant
    model = load_quant(model_path, pt_path, 4, 128)
    model = model.to(torch.device('cuda:0'))
    return model

MODEL_PATH = f'/usr/models/{os.environ["MODEL_PATH"]}'
CHECKPOINT_PATH = f'/usr/models/{os.environ["CHECKPT_PATH"]}'

tokenizer = transformers.LlamaTokenizer.from_pretrained(MODEL_PATH)
model = load_model(MODEL_PATH, CHECKPOINT_PATH,  True)

print("Model loaded. Ready to receive prompts.")

class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str


@celery.task(name="inference")
def inference(messages: List[Message]):
    prompt = ''.join(f"### {m['role']}: {m['content']} \n" for m in messages)
    prompt += """
### Assistant:"""
    print(prompt)
    prediction = run_inference(prompt)
    return prediction

def run_inference(prompt):
    generation_config = transformers.GenerationConfig(
        temperature=0.7,
        top_p=0.70,
    )

    # Tokenize prompt and generate against the model
    batch = tokenizer(prompt, return_tensors="pt")

    # Generate response from model using stopping criteria to stream the output
    with torch.no_grad():
        out = model.generate(
            generation_config=generation_config,
            input_ids=batch["input_ids"].cuda(),
            attention_mask=torch.ones_like(batch["input_ids"]).cuda(),
            max_new_tokens=512,
            # stopping_criteria=[Stream(tokenizer=tokenizer, console=console)]
        )

        #  Send reply back to client
        prediction = tokenizer.decode(out[0])
        return prediction

# class Stream(transformers.StoppingCriteria):
#     def __init__(self, tokenizer, console):
#         self.tokenizer = tokenizer
#         self.console = console

#     def __call__(self, input_ids, scores) -> bool:
#         self.console.erase()
#         self.console.addstr(self.tokenizer.decode(input_ids[0], skip_special_tokens=True))
#         self.console.refresh()
#         return False