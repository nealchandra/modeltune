import modal

from .common import stub
from .inference import Inference

prompt_template = (
    "A chat between a curious human user and an artificial intelligence assistant. The assistant give a helpful, detailed, and accurate answer to the user's question."
    "\n\nUser:\n{}\n\nAssistant:\n"
)


@stub.local_entrypoint()
def llm_test():
    remote = Inference.remote("tiiuae/falcon-7b-instruct")

    remote.train.call()
