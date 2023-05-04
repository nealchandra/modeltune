from alpaca_lora_4bit.monkeypatch.peft_tuners_lora_monkey_patch import replace_peft_model_with_int4_lora_model
replace_peft_model_with_int4_lora_model()

import sys
import os

import peft
import peft.tuners.lora

from datasets import load_dataset
import torch
import transformers
from alpaca_lora_4bit.autograd_4bit import load_llama_model_4bit_low_ram
from peft import LoraConfig, get_peft_model, get_peft_model_state_dict, TaskType


CONFIG_PATH = f'/usr/models/{os.environ["CONFIG_PATH"]}'
MODEL_PATH = f'/usr/models/{os.environ["MODEL_PATH"]}'

LORA_OUTPUT_PATH = f'/usr/models/loras/' 
DATASET_PATH = f'/usr/datasets/{os.environ["DATASET_PATH"]}'

# Load Basic Model
model, tokenizer = load_llama_model_4bit_low_ram(CONFIG_PATH, MODEL_PATH, groupsize=128)

if torch.cuda.device_count() > 1:
    model.is_parallelizable = True
    model.model_parallel = True

MICRO_BATCH_SIZE = 4  # this could actually be 5 but i like powers of 2
BATCH_SIZE = 64
GRADIENT_ACCUMULATION_STEPS = BATCH_SIZE // MICRO_BATCH_SIZE
EPOCHS = 2
LEARNING_RATE = 3e-4  # the Karpathy constant
CUTOFF_LEN = 256
LORA_R = 8
LORA_ALPHA = 16
LORA_DROPOUT = 0.05
WARMUP_STEPS = 50

# Config Lora
lora_config = LoraConfig(
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=LORA_DROPOUT,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

print('Loading PEFT model and data.')

model = get_peft_model(model, lora_config)
data = load_dataset("json", data_files=DATASET_PATH)
data = data['train'].shard(num_shards=200, index=0).train_test_split(test_size=0.1)

# Scales to half
print('Fitting 4bit scales and zeros to half')
for n, m in model.named_modules():
    if 'Autograd4bitQuantLinear' in str(type(m)) or 'Linear4bitLt' in str(type(m)):
        if hasattr(m, "is_v1_model") and m.is_v1_model:
            m.zeros = m.zeros.half()
        m.scales = m.scales.half()

# Set tokenizer
tokenizer.pad_token_id = 0

def tokenize_conversation(conversation):
    prompt = ""
    if conversation[0]['role'] == 'System':
        sys_prompt = conversation.pop(0)['text']
        prompt += f'{sys_prompt} ### \n'

    prompt += ''.join(f"### {m['role']}: {m['text']} \n" for m in conversation)

    result = tokenizer(
        prompt,
        truncation=True,
        max_length=CUTOFF_LEN + 1,
        padding="max_length",
    )
    return {
        "input_ids": result["input_ids"][:-1],
        "attention_mask": result["attention_mask"][:-1],
    }

# Use gradient checkpointing
if True:
    print('Applying gradient checkpointing ...')
    from alpaca_lora_4bit.gradient_checkpointing import apply_gradient_checkpointing
    apply_gradient_checkpointing(model, checkpoint_ratio=1)

training_arguments = transformers.TrainingArguments(
    per_device_train_batch_size=MICRO_BATCH_SIZE,
    warmup_steps=WARMUP_STEPS,
    optim="adamw_torch",
    num_train_epochs=EPOCHS,
    learning_rate=LEARNING_RATE,
    fp16=True,
    logging_steps=10,
    evaluation_strategy="no",
    save_strategy="steps",
    eval_steps=None,
    save_steps=50,
    output_dir=LORA_OUTPUT_PATH,
    save_total_limit=3,
    load_best_model_at_end=False,
)

trainer = transformers.Trainer(
    model=model,
    train_dataset=data['train'].shuffle().map(lambda data: tokenize_conversation(data["conversation"])),
    eval_dataset=data['test'].shuffle().map(lambda data: tokenize_conversation(data["conversation"])),
    args=training_arguments,
    data_collator=transformers.DataCollatorForLanguageModeling(tokenizer, mlm=False),
)
model.config.use_cache = False

# Set Model dict
old_state_dict = model.state_dict
model.state_dict = (
    lambda self, *_, **__: get_peft_model_state_dict(self, old_state_dict())
).__get__(model, type(model))

# Set Verbose
if True:
    transformers.logging.set_verbosity_info()

# Run Trainer
# if ft_config.resume_checkpoint:
#     print('Resuming from {} ...'.format(ft_config.resume_checkpoint))
#     state_dict_peft = torch.load(os.path.join(ft_config.resume_checkpoint, 'pytorch_model.bin'), map_location='cpu')
#     set_peft_model_state_dict(model, state_dict_peft)
#     trainer.train(ft_config.resume_checkpoint)
# else:
trainer.train()

# Restore old model state dict
model.state_dict = old_state_dict

print('Train completed.')

# Save Model
model.save_pretrained(LORA_OUTPUT_PATH)

print('Model Saved.')