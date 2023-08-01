import os
import time
from threading import Thread
from typing import Callable, Literal, Optional, TypedDict, Union

import chevron
import torch
import transformers
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
    TrainerCallback,
    TrainerControl,
    TrainerState,
    TrainingArguments,
)
from transformers.integrations import WandbCallback

from . import utils
from .reporter import CustomWandBCallback, LLMTrainerCallback, TrainingJobStep

MICRO_BATCH_SIZE = 4  # this could actually be 5 but i like powers of 2
BATCH_SIZE = 256
GRADIENT_ACCUMULATION_STEPS = BATCH_SIZE // MICRO_BATCH_SIZE
EPOCHS = 3
LEARNING_RATE = 2e-4
LORA_R = 16
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
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

        config = AutoConfig.from_pretrained(model_path, trust_remote_code=True)
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
            device_map="auto",
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
        prompt_template,
        output_dir,
        *,
        on_log: Callable[[str], None] = None,
        on_step: Callable[[TrainingJobStep, dict], None] = None,
        train_args: Optional[TrainerArgs] = None,
    ):
        self.model.train()

        self.model = prepare_model_for_kbit_training(self.model)
        self.model.config.use_cache = False

        # self.tokenizer.add_special_tokens({"pad_token": "<pad>"})

        config = LoraConfig(
            r=LORA_R,
            lora_alpha=LORA_ALPHA,
            # only support llama atm
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            lora_dropout=LORA_DROPOUT,
            bias="none",
            task_type=TaskType.CAUSAL_LM,
        )
        model = get_peft_model(self.model, config)

        on_step(TrainingJobStep.PREPARING_DATASET)

        data = load_dataset(dataset_path, split="train[:1%]")
        data = data.map(
            lambda row: self.tokenizer(
                f"{chevron.render(prompt_template, row)}{self.tokenizer.eos_token}",
                max_length=self.tokenizer.model_max_length,
                truncation=True,
            )
        )

        callbacks = [LLMTrainerCallback(on_log=on_log, on_step=on_step)]
        if train_args["report_to_wandb"]:
            callbacks.append(
                CustomWandBCallback(
                    on_init=lambda url: on_step(
                        TrainingJobStep.WANDB_RUN_CREATED,
                        {"wandb_url": url},
                    )
                )
            )

        trainer = transformers.Trainer(
            model=model,
            train_dataset=data,
            args=transformers.TrainingArguments(
                per_device_train_batch_size=1,
                gradient_accumulation_steps=18,
                num_train_epochs=EPOCHS,
                learning_rate=LEARNING_RATE,
                fp16=True,
                warmup_steps=2,
                logging_steps=1,
                output_dir=output_dir,
                save_total_limit=2,
                run_name=f"{output_dir.split('/')[-1]}",
                optim="paged_adamw_32bit",
            ),
            callbacks=callbacks,
            data_collator=DataCollatorForLanguageModeling(self.tokenizer, mlm=False),
        )
        trainer.train()
        model.save_pretrained(output_dir)

    def generate_streaming(self, generation_args: GenerationArgs, prompt: str):
        self.model.eval()

        generation_config = GenerationConfig(
            **{
                "temperature": 0.75,
                "top_p": 1,
                "repetition_penalty": 1,
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
