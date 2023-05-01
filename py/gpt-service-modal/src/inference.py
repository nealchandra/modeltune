import modal
import time


from .common import stub, cache_volume
from .download import download_model

# NOTE: The 3 functions below all run on an inference worker. load_deps must be the first fn called on the worker.
def load_monkeypatch_deps():
    from peft import PeftModel
    import alpaca_lora_4bit.autograd_4bit
    from alpaca_lora_4bit.monkeypatch.peft_tuners_lora_monkey_patch import replace_peft_model_with_int4_lora_model

    alpaca_lora_4bit.autograd_4bit.use_new = True
    alpaca_lora_4bit.autograd_4bit.auto_switch = True

    replace_peft_model_with_int4_lora_model()

def load_model_and_lora(repo_id, model_path, lora=None):
    from peft import PeftModel
    from alpaca_lora_4bit.autograd_4bit import load_llama_model_4bit_low_ram
    from huggingface_hub import try_to_load_from_cache, _CACHED_NO_EXIST

    filepath = try_to_load_from_cache(repo_id, filename=model_path, cache_dir="/vol/cache")
    if filepath is _CACHED_NO_EXIST:
        download_model.call(repo_id)
    
    model, tokenizer = load_llama_model_4bit_low_ram(repo_id, filepath, half=True)
    print('Loaded model and tokenizer for {}'.format(repo_id))
    if lora:
        model = PeftModel.from_pretrained(model, lora, device_map={'': 0}, torch_dtype=torch.float32)
        print('{} Lora Applied.'.format(lora))
    
    return model, tokenizer


def inference(model, tokenizer, prompt):    
    import torch
    import transformers


    class StopConversation(transformers.StoppingCriteria):
        def __init__(self, tokenizer):
            self.tokenizer = tokenizer

        def __call__(self, input_ids, scores) -> bool:
            # exit if the model generates a prompt which contains "### Human:", indicating the 
            # model is erroneously hallucinating a human response
            return self.tokenizer.decode(input_ids[0], skip_special_tokens=True).endswith("### Human:")

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