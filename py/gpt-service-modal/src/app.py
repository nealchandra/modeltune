"""
Main web application service. Serves the static frontend as well as
API routes for transcription, language model generation and text-to-speech.
"""

import json
from pathlib import Path

import modal

from .common import stub, cache_volume
from .factory import InferenceFactory
from .inference import load_monkeypatch_deps, load_model_and_lora, inference

from typing import TypedDict, List, Literal

class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str


@stub.cls(**{
        "cloud": "gcp",
        "gpu": "A100",
        "image": stub.inference_image,
        "secret": modal.Secret.from_name("hf-secret"),
        "shared_volumes": {'/root/.cache/huggingface/hub': cache_volume},
        "container_idle_timeout": 90,
})
class Inference:
    def __enter__(self):
        load_monkeypatch_deps()
        self.model, self.tokenizer = load_model_and_lora('TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g', 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors', None)

    @modal.method()
    def prompt(self, prompt):
        return inference(model=self.model, tokenizer=self.tokenizer, prompt=prompt)

@stub.function(
    image=stub.download_image,
    container_idle_timeout=300,
    timeout=600,
)
@modal.asgi_app()
def web():
    from pydantic import BaseModel
    from fastapi import FastAPI, Request
    from fastapi.responses import Response, StreamingResponse
    from fastapi.staticfiles import StaticFiles
    
    # hack to allow spawning modal fn inside a modal instance
    modal.app._is_container_app = False
    
    web_app = FastAPI()
    # factory = InferenceFactory(stub, {
    #     "cloud": "gcp",
    #     "gpu": "A100",
    #     "image": stub.inference_image,
    #     "secret": modal.Secret.from_name("hf-secret"),
    #     "shared_volumes": {'/root/.cache/huggingface/hub': cache_volume},
    # })
    inference = Inference()


    class ChatCompletionRequest(BaseModel):
        content: str


    @web_app.post("/generate")
    async def generate(request: ChatCompletionRequest):
        content = request.content
        
        messages: List[Message] = [
            {'role': 'System', 'content': 'You are a friendly AI assistant'},
            {'role': 'Human', 'content': f'{content}'}
        ]

        prompt = ""
        if messages[0]['role'] == 'System':
            sys_prompt = messages.pop(0)['content']
            prompt += f'{sys_prompt} ###\n'

        prompt += ''.join(f"### {m['role']}: {m['content']} \n" for m in messages)
        prompt += """
    ### Assistant:"""
        print(prompt)

        inference.prompt.call(prompt)
        # fn = factory.get_model_inference_fn('TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g', 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors')
        
        # with stub.run():
        #     fn.call(prompt)

    return web_app
