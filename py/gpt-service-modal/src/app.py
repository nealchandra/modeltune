"""
Main web application service. Serves the static frontend as well as
API routes for transcription, language model generation and text-to-speech.
"""

import json
from pathlib import Path
from typing import List, Literal, Optional, TypedDict

import modal

from .common import stub
from .factory import InferenceFactory


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
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import Response, StreamingResponse
    from fastapi.staticfiles import StaticFiles
    from pydantic import BaseModel

    web_app = FastAPI()
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["POST", "GET"],
        allow_headers=["*"],
    )
    factory = InferenceFactory()

    class ChatCompletionRequest(BaseModel):
        repo_id: str
        model_path: str
        lora: Optional[str]
        content: str

    @web_app.post("/generate")
    async def generate(request: ChatCompletionRequest):
        content = request.content

        predict = factory.get_model_inference_fn(
            request.repo_id, request.model_path, request.lora
        )

        return StreamingResponse(
            predict(content),
            media_type="text/event-stream",
        )

    return web_app
