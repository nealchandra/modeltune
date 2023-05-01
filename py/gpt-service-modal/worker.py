import modal

from src.common import stub, cache_volume
from src.download import download_model
from src.factory import InferenceFactory

from typing import TypedDict, List, Literal

class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str

messages: List[Message] = [
    {'role': 'System', 'content': 'You are a friendly AI assistant'},
    {'role': 'Human', 'content': 'What is a llama?'}
]

factory = InferenceFactory(stub, {
    "cloud": "gcp",
    "gpu": "A100",
    "image": stub.inference_image,
    "secret": modal.Secret.from_name("hf-secret"),
    "shared_volumes": {'/vol/cache': cache_volume},
})

@stub.local_entrypoint()
def main():
    prompt = ""
    if messages[0]['role'] == 'System':
        sys_prompt = messages.pop(0)['content']
        prompt += f'{sys_prompt} ###\n'

    prompt += ''.join(f"### {m['role']}: {m['content']} \n" for m in messages)
    prompt += """
### Assistant:"""
    print(prompt)

    fn = factory.get_model_inference_fn('TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g', 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors')

    with stub.run():
        res = fn.call(prompt)

        print(res)