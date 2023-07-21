from enum import Enum
from typing import Callable

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
from transformers.trainer_callback import TrainerControl, TrainerState
from transformers.training_args import TrainingArguments


class TrainingJobStep(str, Enum):
    JOB_STARTED = "JOB_STARTED"
    JOB_FAILED = "JOB_FAILED"
    JOB_COMPLETED = "JOB_COMPLETED"
    JOB_CANCELLED = "JOB_CANCELLED"
    PREPARING_DATASET = "PREPARING_DATASET"
    TRAINING_STARTED = "TRAINING_STARTED"
    EPOCH_COMPLETED = "EPOCH_COMPLETED"


class LLMTrainerCallback(TrainerCallback):
    def __init__(
        self,
        on_log: Callable[[str], None] = None,
        on_step: Callable[[TrainingJobStep], None] = None,
    ):
        self._on_log = on_log
        self._on_step = on_step

    def on_train_begin(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        self._on_step and self._on_step(TrainingJobStep.TRAINING_STARTED)
        return super().on_train_begin(args, state, control, **kwargs)

    def on_train_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        self._on_step and self._on_step(TrainingJobStep.JOB_COMPLETED)
        return super().on_train_end(args, state, control, **kwargs)

    def on_epoch_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        self._on_step and self._on_step(TrainingJobStep.TRAINING_STARTED)
        return super().on_epoch_end(args, state, control, **kwargs)

    def on_log(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        logs=None,
        **kwargs,
    ):
        self._on_log and self._on_log(str(logs))
        return super().on_log(args, state, control, **kwargs)
