from typing import List, Literal, TypedDict

import modal
from src.common import cache_volume, stub
from src.download import download_model
from src.factory import InferenceFactory
from src.inference import Inference


class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str

messages: List[Message] = [
    {'role': 'System', 'content': 'You are a friendly AI assistant'},
    {'role': 'Human', 'content': 'What is a llama?'}
]

factory = InferenceFactory()

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

    predict = factory.get_model_inference_fn('TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g', 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors')
    predict(prompt)

    # fn = factory.get_model_inference_fn('TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g', 'vicuna-13B-1.1-GPTQ-4bit-128g.latest.safetensors')

    # with stub.run():
    #     res = fn.call(prompt)

    #     print(res)