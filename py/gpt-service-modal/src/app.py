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


# @modal.asgi_app()
# def web():
#     web_app = FastAPI()
#     m = Inference.remote(param1, param2)

#     @web_app.get("/stats")
#     async def static(request: StatsRequest = Depends()):
#         return m.my_method.get_current_stats()

#     @web_app.post("/generate")
#     async def generate(body: Request):
#         return StreamingResponse(
#             m.my_method(body.content),
#             media_type="text/event-stream",
#         )


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
        model_path: str
        lora: Optional[str]
        content: str

        generation_args: dict

    @web_app.get("/stats")
    async def static(request: StatsRequest = Depends()):
        # stats = Inference.remote(
        #     request.repo_id, request.model_path
        # ).predict.get_current_stats()

        stats = Inference.remote(
            "TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g",
            "vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors",
        ).predict.get_current_stats()
        return stats

    @web_app.post("/generate")
    async def generate(body: ChatCompletionRequest, request: Request):
        content = body.content

        predict = Inference.remote(
            "TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g",
            "vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors",
        ).predict

        return StreamingResponse(
            predict(
                content,
                body.generation_args,
                body.lora,
            ),
            headers={
                "Modal-Call-ID": predict.object_id,
                "Access-Control-Expose-Headers": "Modal-Call-ID",
            },
            media_type="text/event-stream",
        )

    @web_app.delete("/generation/{call_id}")
    async def cancel_generation(call_id: str):
        from modal.functions import FunctionCall

        print("Cancelling", call_id)
        function_call = FunctionCall.from_id(call_id)
        function_call.cancel()

    return web_app
