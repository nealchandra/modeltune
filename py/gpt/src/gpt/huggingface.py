import os

from huggingface_hub import login, snapshot_download


class HuggingfaceClient:
    def __init__(self, token, download_model_fn=snapshot_download, cache_dir=None):
        self.token = token
        self.cache_dir = cache_dir

        self._download_model = download_model_fn

    def get_cache_dir(self):
        return self.cache_dir

    def download_model(self, repo_id: str):
        # login(self.token)
        self._download_model(
            repo_id=repo_id,
            ignore_patterns="*.pt",
            # cache_dir=self.cache_dir,
            token=self.token,
        )
