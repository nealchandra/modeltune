import os
import time
from threading import Thread
from typing import Literal, Optional, TypedDict, Union

import torch
import transformers
from huggingface_hub import (
    _CACHED_NO_EXIST,
    login,
    scan_cache_dir,
    try_to_load_from_cache,
)
from huggingface_hub.constants import HUGGINGFACE_HUB_CACHE
from peft import LoraConfig, PeftModel, get_peft_model, prepare_model_for_int8_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    GenerationConfig,
    LlamaForCausalLM,
    LlamaTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
    StoppingCriteria,
    TextIteratorStreamer,
)

from . import utils

MICRO_BATCH_SIZE = 4  # this could actually be 5 but i like powers of 2
BATCH_SIZE = 256
GRADIENT_ACCUMULATION_STEPS = BATCH_SIZE // MICRO_BATCH_SIZE
# EPOCHS = 3  # we don't need 3 tbh
EPOCHS = 1
LEARNING_RATE = 3e-4  # the Karpathy constant
CUTOFF_LEN = 256  # 256 accounts for about 96% of the data
LORA_R = 8
LORA_ALPHA = 16
LORA_DROPOUT = 0.05

## POTENTIAL ARGS
# LORA_ALPHA = 8
# LORA_DROPOUT = 0.1


class GenerationArgs(TypedDict):
    top_p: Optional[float]
    top_k: Optional[int]
    temperature: Optional[float]
    repetiton_penalty: Optional[float]
    stopping_sequence: Optional[str]


class LLM:
    model_type: Union[Literal["Llama"], Literal["Falcon"]]
    model: Optional[PreTrainedModel]
    tokenizer: Optional[PreTrainedTokenizer]

    def load_model(self, model_path: str):
        nf4_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=False,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            quantization_config=nf4_config,
            trust_remote_code=True,
            device_map="auto",
        )
        self.model.eval()
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)

    def apply_lora(self, lora: str):
        if not self.model:
            raise Exception("Model not loaded")

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

    # def train(self, train_args):
    #     self.model = prepare_model_for_int8_training(self.model)

    #     config = LoraConfig(
    #         r=LORA_R,
    #         lora_alpha=LORA_ALPHA,
    #         target_modules=["q_proj", "v_proj"],
    #         lora_dropout=LORA_DROPOUT,
    #         bias="none",
    #         task_type=TaskType.CAUSAL_LM,
    #     )
    #     model = get_peft_model(model, config)
    #     self.tokenizer.pad_token_id = (
    #         0  # unk. we want this to be different from the eos token
    #     )
    #     data = load_dataset(dataset_repo_id)

    #     from src.prompts.alpaca import prompt

    #     def tokenize(data):
    #         result = tokenizer(
    #             prompt.generate_prompt(data),
    #             truncation=True,
    #             max_length=CUTOFF_LEN + 1,
    #             padding="max_length",
    #         )
    #         return {
    #             "input_ids": result["input_ids"][:-1],
    #             "attention_mask": result["attention_mask"][:-1],
    #         }

    #     data = data.shuffle().map(lambda x: tokenize(x))

    #     trainer = transformers.Trainer(
    #         model=model,
    #         train_dataset=data["train"],
    #         args=transformers.TrainingArguments(
    #             per_device_train_batch_size=MICRO_BATCH_SIZE,
    #             gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
    #             warmup_steps=100,
    #             num_train_epochs=EPOCHS,
    #             learning_rate=LEARNING_RATE,
    #             fp16=True,
    #             logging_steps=10,
    #             output_dir=output_path,
    #             save_total_limit=3,
    #         ),
    #         data_collator=transformers.DataCollatorForLanguageModeling(
    #             tokenizer, mlm=False
    #         ),
    #     )
    #     model.config.use_cache = False
    #     trainer.train(resume_from_checkpoint=False)

    #     model.save_pretrained(output_path)

    def generate_streaming(self, generation_config: GenerationArgs, prompt: str):
        generation_config = GenerationConfig(
            **{
                "temperature": 0.7,
                "top_p": 0.70,
                "repetition_penalty": 1 / 0.85,
                "stopping_sequence": "### Human:",
                "max_new_tokens": 512,
                "do_sample": True,
                **generation_config,
            }
        )

        tokenized = self.tokenizer(prompt, return_tensors="pt")
        input_ids = tokenized.input_ids
        input_ids = input_ids.to(self.model.device)

        streamer = TextIteratorStreamer(self.tokenizer, skip_special_tokens=True)
        generate_kwargs = dict(
            input_ids=input_ids,
            generation_config=generation_config,
            return_dict_in_generate=True,
            eos_token_id=self.tokenizer.eos_token_id,
            pad_token_id=self.tokenizer.eos_token_id,
            bos_token_id=self.tokenizer.bos_token_id,
            attention_mask=tokenized.attention_mask,
            output_scores=True,
            streamer=streamer,
        )

        thread = Thread(target=self.model.generate, kwargs=generate_kwargs)
        thread.start()
        for new_text in streamer:
            yield new_text

        thread.join()


class LlamaLLM(LLM):
    model_type: Literal["Llama"] = "Llama"
    model: Optional[LlamaForCausalLM]
    tokenizer: Optional[LlamaTokenizer]
