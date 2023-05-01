import os
import modal

from .common import stub, cache_volume

if stub.is_inside():
    from huggingface_hub import login, snapshot_download

@stub.function(
    cloud="gcp",
    image=stub.download_image,
    secret=modal.Secret.from_name("hf-secret"),
    shared_volumes={'/vol/cache': cache_volume},
)
def download_model(repo_id: str = 'TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g'):
    login(os.environ["HUGGINGFACE_TOKEN"])
    snapshot_download(repo_id=repo_id, ignore_patterns="*.pt", cache_dir="/vol/cache")

