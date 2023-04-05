import os

from typing import Union

from celery import Celery
from celery.result import AsyncResult

from fastapi import Body, FastAPI, Form, Request
from fastapi.responses import JSONResponse

from fastapi import FastAPI

app = FastAPI()

celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379")


@app.post("/inferences", status_code=201)
def create_inference(payload = Body(...)):
    task_type = payload["type"]
    task = celery.send_task('fetch_data', kwargs={'task_type': int(task_type)})
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