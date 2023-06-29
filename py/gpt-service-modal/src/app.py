"""
Main web application service. Serves the static frontend as well as
API routes for transcription, language model generation and text-to-speech.
"""

import json
import os
from pathlib import Path
from typing import List, Literal, Optional, TypedDict

import modal

from .common import stub
from .download import download_model
from .inference import Inference


class Message(TypedDict):
    role: Literal["System", "Human", "Assistant"]
    content: str


@stub.function(
    image=stub.download_image,
    container_idle_timeout=300,
    timeout=600,
)
@modal.asgi_app()
def web():
    import asyncio
    import time

    from fastapi import Depends, FastAPI, Query, Request
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

    @web_app.post("/generate")
    async def generate(body: ChatCompletionRequest, request: Request):
        content = body.content

        predict = Inference.remote(body.repo_id).predict

        return StreamingResponse(
            predict.call(
                content,
                body.generation_args,
                body.lora,
            ),
            media_type="text/event-stream",
        )

    @web_app.delete("/generation/{call_id}")
    async def cancel_generation(call_id: str):
        from modal.functions import FunctionCall

        print("Cancelling", call_id)
        function_call = FunctionCall.from_id(call_id)
        function_call.cancel()

    return web_app
