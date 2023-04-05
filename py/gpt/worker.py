import os
import time
from pathlib import Path

from celery import Celery

import torch
import transformers

sys.path.insert(0, os.path.join(os.path.dirname( __file__ ), str(Path("./repositories/GPTQ-for-LLaMa"))))
import llama

celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379")

tokenizer = transformers.LlamaTokenizer.from_pretrained("./models/vicuna-13b-4bit")
model = load_model("/usr/models/vicuna-13b-4bit", "/usr/models/vicuna-13b-4bit/vicuna-13b-4bit-128g.safetensors",  True)

@celery.task(name="create_task")
def create_task(task_type):
    time.sleep(int(task_type) * 10)
    return True


def run_inference(prompt):
    generation_config = transformers.GenerationConfig(
        temperature=0.1,
        top_p=0.75,
        num_beams=4,
    )

    print("Model loaded. Ready to receive prompts.")
    # Tokenize prompt and generate against the model
    batch = tokenizer(TRAINING_TEXT_NO_INPUT.format(instruction=prompt), return_tensors="pt")

    # Generate response from model using stopping criteria to stream the output
    with torch.no_grad():
        out = model.generate(
            generation_config=generation_config,
            input_ids=batch["input_ids"].cuda(),
            attention_mask=torch.ones_like(batch["input_ids"]).cuda(),
            max_length=500,
            # stopping_criteria=[Stream(tokenizer=tokenizer, console=console)]
        )

        #  Send reply back to client
        socket.send(tokenizer.decode(out[0]).encode('utf-8'))

# class Stream(transformers.StoppingCriteria):
#     def __init__(self, tokenizer, console):
#         self.tokenizer = tokenizer
#         self.console = console

#     def __call__(self, input_ids, scores) -> bool:
#         self.console.erase()
#         self.console.addstr(self.tokenizer.decode(input_ids[0], skip_special_tokens=True))
#         self.console.refresh()
#         return False

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