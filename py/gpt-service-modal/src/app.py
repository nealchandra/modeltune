"""
Main web application service. Serves the static frontend as well as
API routes for transcription, language model generation and text-to-speech.
"""

import json
from pathlib import Path

from modal import Mount, asgi_app

from .common import stub
from .inference import Inference

from typing import TypedDict, List, Literal

class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str


@stub.function(
    container_idle_timeout=300,
    timeout=600,
)
@asgi_app()
def web():
    from fastapi import FastAPI, Request
    from fastapi.responses import Response, StreamingResponse
    from fastapi.staticfiles import StaticFiles

    web_app = FastAPI()
    inference = Inference()

    @web_app.post("/generate")
    async def generate(request: Request):
        # body = await request.json()
        
        messages: List[Message] = [
            {'role': 'System', 'content': 'You are a friendly AI assistant'},
            {'role': 'User', 'content': 'What is a llama?'}
        ]

        prompt = ""
        if messages[0]['role'] == 'System':
            sys_prompt = messages.pop(0)['content']
            prompt += f'{sys_prompt} ###\n'

        prompt += ''.join(f"### {m['role']}: {m['content']} \n" for m in messages)
        prompt += """
    ### Assistant:"""
        print(prompt)

        inference.run_inference(prompt)

    return web_app
