import modal

from .common import stub
from .inference import Inference

prompt_template = (
    "A chat between a curious human user and an artificial intelligence assistant. The assistant give a helpful, detailed, and accurate answer to the user's question."
    "\n\nUser:\n{}\n\nAssistant:\n"
)


@stub.local_entrypoint()
def llm_test():
    remote = Inference.remote("TheBloke/Wizard-Vicuna-13B-Uncensored-HF")

    question = "What are the main differences between Python and JavaScript programming languages?"
    for text in remote.predict.call(prompt_template.format(question)):
        print(text, end="", flush=True)
