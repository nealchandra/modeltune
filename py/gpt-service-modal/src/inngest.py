import os

import requests


class Inngest:
    def __init__(self, job_id, inngest_env=None):
        self.endpoint = "https://inn.gs/e"
        self.event_key = os.environ.get("INNGEST_EVENT_KEY", None)
        self.env = inngest_env
        self.job_id = job_id

    def post_event(self, name, data):
        if self.event_key:
            r = requests.post(
                f"{self.endpoint}/{self.event_key}",
                json={
                    "name": name,
                    "data": data,
                },
                headers={"x-inngest-env": self.env} if self.env else None,
            )
        else:
            print(f"No event key set. Skipping {name} with data {data}")

    def post_log(self, log):
        self.post_event(
            "training/log.create",
            {
                "jobId": self.job_id,
                "log": log,
            },
        )

    def post_step(self, step_type, data=None):
        payload = {
            "jobId": self.job_id,
            "stepType": step_type,
        }
        if data:
            payload["payload"] = data

        self.post_event(
            "training/step.create",
            payload,
        )
