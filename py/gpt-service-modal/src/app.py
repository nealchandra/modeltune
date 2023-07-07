"""
Main web application service. Serves the static frontend as well as
API routes for transcription, language model generation and text-to-speech.
"""

import json
import os
from pathlib import Path
from typing import List, Literal, Optional, TypedDict

import modal

from .common import finetunes_volume, stub
from .download import download_model
from .inference import Inference


class Message(TypedDict):
    role: Literal["System", "Human", "Assistant"]
    content: str


def train_finetune(
    base_model_repo_id,
    dataset_repo_id: str,
    dataset_feature: str,
    model_name: str,
    wanb_key: Optional[str],
):
    remote = Inference.remote(base_model_repo_id)
    remote.train.call(
        dataset_repo_id,
        dataset_feature,
        f"{base_model_repo_id.replace('/', '--')}/{model_name}",
        wanb_key,
    )


@stub.function(
    cloud="gcp",
    image=stub.download_image,
    container_idle_timeout=300,
    timeout=600,
    shared_volumes={
        "/finetunes": finetunes_volume,
    },
)
@modal.asgi_app()
def web():
    import asyncio
    import time

    from fastapi import BackgroundTasks, Depends, FastAPI, Query, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import Response, StreamingResponse
    from fastapi.staticfiles import StaticFiles
    from pydantic import BaseModel

    web_app = FastAPI()
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["POST", "GET", "DELETE"],
        allow_headers=["*"],
    )

    class StatsRequest(BaseModel):
        repo_id: str = Query("")
        model_path: str = Query("")

    class ChatCompletionRequest(BaseModel):
        repo_id: str
        lora: Optional[str]
        content: str

        generation_args: dict

    class TrainRequest(BaseModel):
        base_model_repo_id: str
        dataset_repo_id: str
        dataset_feature: str
        model_name: str
        wandb_key: Optional[str]

    @web_app.post("/generate")
    async def generate(body: ChatCompletionRequest, request: Request):
        content = body.content

        remote = Inference.remote(body.repo_id)

        def generate_cummulative():
            full = ""
            for text in remote.predict.call(
                content,
                generation_args=body.generation_args,
                lora=body.lora,
            ):
                full += text
                print(text, end="", flush=True)
                yield full

        return StreamingResponse(
            generate_cummulative(),
            media_type="text/event-stream",
        )

    @web_app.get("/finetunes")
    async def list_finetunes(base_model_repo_id: str):
        finetunes_path = f"/finetunes/{base_model_repo_id.replace('/', '--')}"
        return os.listdir(finetunes_path) if os.path.exists(finetunes_path) else []

    @web_app.post("/train")
    async def train(body: TrainRequest, background_tasks: BackgroundTasks):
        background_tasks.add_task(
            train_finetune,
            body.base_model_repo_id,
            body.dataset_repo_id,
            body.dataset_feature,
            body.model_name,
            body.wandb_key,
        )

        return {"status": "ok"}

    @web_app.delete("/generation/{call_id}")
    async def cancel_generation(call_id: str):
        from modal.functions import FunctionCall

        print("Cancelling", call_id)
        function_call = FunctionCall.from_id(call_id)
        function_call.cancel()

    return web_app
