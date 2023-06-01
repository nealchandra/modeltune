import modal

from .common import cache_volume, stub


@stub.function(
    **{
        "cloud": "gcp",
        "gpu": "A100",
        "image": stub.inference_image,
        "secret": modal.Secret.from_name("hf-secret"),
        "shared_volumes": {"/root/.cache/huggingface/hub": cache_volume},
        "concurrency_limit": 1,
        "container_idle_timeout": 200,
    }
)
def test():
    print('yea')