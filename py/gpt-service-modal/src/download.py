import os

import modal

from .common import cache_volume, models_volume, stub

if stub.is_inside():
    from huggingface_hub import login, snapshot_download


@stub.function(
    cloud="gcp",
    image=stub.download_image,
    secret=modal.Secret.from_name("hf-secret"),
    shared_volumes={
        "/root/.cache/huggingface/hub": cache_volume,
        "/models": models_volume,
    },
)
def download_model(*args, **kwargs):
    snapshot_download(*args, **kwargs)
