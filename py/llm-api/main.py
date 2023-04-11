import os

from typing import Literal, List

from celery import Celery
from celery.result import AsyncResult

from pydantic import BaseModel
from fastapi import Body, FastAPI, Form, Request
from fastapi.responses import JSONResponse

from fastapi import FastAPI

app = FastAPI()

celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379")

class Message(BaseModel):
    role: Literal['Human','System','Assistant']
    content: str

class ChatCompletionRequest(BaseModel):
    messages: List[Message]

class ChatCompletionResponse(BaseModel):
    task_id: str

class InferenceResponse(BaseModel):
    task_id: str
    task_status: str
    task_result: str

@app.post("/inferences", status_code=201, response_model=ChatCompletionResponse)
def create_inference(body: ChatCompletionRequest = Body(...)):
    messages = [m.dict() for m in body.messages]
    task = celery.send_task('inference', kwargs={'messages': messages})
    return JSONResponse({"task_id": task.id})


@app.get("/inferences/{task_id}", response_model=InferenceResponse)
def get_inference_status(task_id: str):
    task_result = AsyncResult(task_id)
    result = {
        "task_id": task_id,
        "task_status": task_result.status,
        "task_result": task_result.result
    }
    return JSONResponse(result)