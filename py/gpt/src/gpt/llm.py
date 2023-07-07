import os
import time
from threading import Thread
from typing import Literal, Optional, TypedDict, Union

import torch
import transformers
import wandb
from datasets import load_dataset
from huggingface_hub import (
    _CACHED_NO_EXIST,
    login,
    scan_cache_dir,
    try_to_load_from_cache,
)
from huggingface_hub.constants import HUGGINGFACE_HUB_CACHE
from peft import (
    LoraConfig,
    PeftModel,
    TaskType,
    get_peft_model,
    prepare_model_for_kbit_training,
)
from peft import utils as peft_utils
from transformers import (
    AutoConfig,
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    GenerationConfig,
    LlamaForCausalLM,
    LlamaTokenizer,
    PreTrainedModel,
    PreTrainedTokenizer,
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


class TrainerArgs(TypedDict):
    report_to_wandb: bool


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

        config = AutoConfig.from_pretrained(model_path, trust_remote_code=True)
        # if "mpt" in model_path:
        #     config.attn_config[
        #         "attn_impl"
        #     ] = "triton"  # change this to use triton-based FlashAttention
        #     config.init_device = "cuda:0"  # For fast initialization directly on GPU!

        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            config=config,
            quantization_config=nf4_config,
            trust_remote_code=True,
            device_map="auto",
        )
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)

    def apply_lora(self, lora_path: str):
        if not self.model:
            raise Exception("Model not loaded")

        self.model = PeftModel.from_pretrained(
            self.model,
            lora_path,
            device_map={"": 0},
            torch_dtype=torch.float32,
        )
        print("{} Lora Applied.".format(lora_path))

    def remove_lora(self):
        if not self.model:
            raise Exception("Model not loaded")

        self.model = PeftModel.get_base_model(self.model)

    def train(
        self,
        dataset_path,
        dataset_feature,
        output_dir,
        train_args: Optional[TrainerArgs] = None,
    ):
        self.model.train()

        self.model = prepare_model_for_kbit_training(self.model)
        self.model.config.use_cache = False

        if False:
            target_modules = ["q_proj", "v_proj"]
        else:
            target_modules = ["query_key_value"]

        config = LoraConfig(
            r=LORA_R,
            lora_alpha=LORA_ALPHA,
            target_modules=target_modules,
            lora_dropout=LORA_DROPOUT,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        model = get_peft_model(self.model, config)

        data = load_dataset(dataset_path)
        data = (
            data["train"]
            .select(range(10))
            .map(lambda samples: self.tokenizer(samples[dataset_feature]))
        )

        self.tokenizer.pad_token = self.tokenizer.eos_token

        trainer = transformers.Trainer(
            model=model,
            train_dataset=data,
            args=transformers.TrainingArguments(
                per_device_train_batch_size=MICRO_BATCH_SIZE,
                gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
                num_train_epochs=EPOCHS,
                learning_rate=LEARNING_RATE,
                fp16=True,
                warmup_steps=2,
                max_steps=20,
                logging_steps=1,
                output_dir=output_dir,
                save_total_limit=2,
                report_to="wandb" if train_args["report_to_wandb"] else None,
                run_name=f"modeltune-{output_dir.split('/')[-1]}",
            ),
            data_collator=DataCollatorForLanguageModeling(self.tokenizer, mlm=False),
        )
        trainer.train()
        model.save_pretrained(output_dir)

    def generate_streaming(self, generation_args: GenerationArgs, prompt: str):
        self.model.eval()

        generation_config = GenerationConfig(
            **{
                "temperature": 0.7,
                "top_p": 0.70,
                "repetition_penalty": 1 / 0.85,
                "max_new_tokens": 512,
                "do_sample": True,
                **generation_args,
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
            stopping_criteria=[
                utils.Stop(self.tokenizer, generation_args["stopping_sequence"])
            ],
        )

        thread = Thread(target=self.model.generate, kwargs=generate_kwargs)
        thread.start()
        for new_text in streamer:
            yield new_text

        thread.join()
