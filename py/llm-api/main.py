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

@app.post("/inferences", status_code=201)
def create_inference(body: ChatCompletionRequest = Body(...)):
    messages = [m.dict() for m in body.messages]
    task = celery.send_task('inference', kwargs={'messages': messages})
    return JSONResponse({"task_id": task.id})


@app.get("/inferences/{task_id}")
def get_inference_status(task_id):
    task_result = AsyncResult(task_id)
    result = {
        "task_id": task_id,
        "task_status": task_result.status,
        "task_result": task_result.result
    }
    return JSONResponse(result)