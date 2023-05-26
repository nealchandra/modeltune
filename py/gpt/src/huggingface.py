import os

from huggingface_hub import login, snapshot_download


class HuggingfaceClient:
    def __init__(self, token, cache_dir=None):
        self.token = token
        self.cache_dir = cache_dir

    def download_model(self, repo_id: str):
        # login(self.token)
        snapshot_download(
            repo_id=repo_id,
            ignore_patterns="*.pt",
            cache_dir=self.cache_dir,
            auth_token=self.token,
        )
