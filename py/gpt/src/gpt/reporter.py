import os
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
from transformers.integrations import WandbCallback
from transformers.trainer_callback import TrainerControl, TrainerState
from transformers.training_args import TrainingArguments
from transformers.utils import is_torch_tpu_available


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


class CustomWandBCallback(WandbCallback):
    def __init__(self, on_init: Callable[[str], None] = None):
        import wandb

        wandb.log = lambda *args, **kwargs: None

        self._on_init = on_init
        print("Custom W&B Reporter Initialized")
        super().__init__()

        os.environ["WANDB_PROJECT"] = "modeltune"

    def setup(self, args, state, model, **kwargs):
        """
        Setup the optional Weights & Biases (*wandb*) integration.

        One can subclass and override this method to customize the setup if needed. Find more information
        [here](https://docs.wandb.ai/guides/integrations/huggingface). You can also override the following environment
        variables:

        Environment:
        - **WANDB_LOG_MODEL** (`str`, *optional*, defaults to `"false"`):
            Whether to log model and checkpoints during training. Can be `"end"`, `"checkpoint"` or `"false"`. If set
            to `"end"`, the model will be uploaded at the end of training. If set to `"checkpoint"`, the checkpoint
            will be uploaded every `args.save_steps` . If set to `"false"`, the model will not be uploaded. Use along
            with [`~transformers.TrainingArguments.load_best_model_at_end`] to upload best model.

            <Deprecated version="5.0">

            Setting `WANDB_LOG_MODEL` as `bool` will be deprecated in version 5 of 🤗 Transformers.

            </Deprecated>
        - **WANDB_WATCH** (`str`, *optional* defaults to `"false"`):
            Can be `"gradients"`, `"all"`, `"parameters"`, or `"false"`. Set to `"all"` to log gradients and
            parameters.
        - **WANDB_PROJECT** (`str`, *optional*, defaults to `"huggingface"`):
            Set this to a custom string to store results in a different project.
        - **WANDB_DISABLED** (`bool`, *optional*, defaults to `False`):
            Whether to disable wandb entirely. Set `WANDB_DISABLED=true` to disable.
        """
        if self._wandb is None:
            return

        self._initialized = True
        if state.is_world_process_zero:
            combined_dict = {**args.to_sanitized_dict()}

            if hasattr(model, "config") and model.config is not None:
                model_config = model.config.to_dict()
                combined_dict = {**model_config, **combined_dict}
            trial_name = state.trial_name
            init_args = {}
            if trial_name is not None:
                init_args["name"] = trial_name
                init_args["group"] = args.run_name
            else:
                if not (args.run_name is None or args.run_name == args.output_dir):
                    init_args["name"] = args.run_name

            if self._wandb.run is None:
                r = self._wandb.init(
                    project="modeltune",
                    **init_args,
                )
            # add config parameters (run may have been created manually)
            x = self._wandb.config.update(combined_dict, allow_val_change=True)
            self._on_init(self._wandb.run.get_url())

            # define default x-axis (for latest wandb versions)
            if getattr(self._wandb, "define_metric", None):
                self._wandb.define_metric("train/global_step")
                self._wandb.define_metric(
                    "*", step_metric="train/global_step", step_sync=True
                )

            # keep track of model topology and gradients, unsupported on TPU
            _watch_model = os.getenv("WANDB_WATCH", "false")
            if not is_torch_tpu_available() and _watch_model in (
                "all",
                "parameters",
                "gradients",
            ):
                self._wandb.watch(
                    model, log=_watch_model, log_freq=max(100, args.logging_steps)
                )

    def on_log(self, args, state, control, model=None, logs=None, **kwargs):
        return None
