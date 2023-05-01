import modal

from src.common import stub
from src.download import download_model
from src.inference import Inference

from typing import TypedDict, List, Literal

class Message(TypedDict):
    role: Literal['System','Human','Assistant']
    content: str

messages: List[Message] = [
    {'role': 'System', 'content': 'You are a friendly AI assistant'},
    {'role': 'Human', 'content': 'What is a llama?'}
]

@stub.local_entrypoint()
def main():
    download_model.call('TheBloke/vicuna-13B-1.1-GPTQ-4bit-128g')

    prompt = ""
    if messages[0]['role'] == 'System':
        sys_prompt = messages.pop(0)['content']
        prompt += f'{sys_prompt} ###\n'

    prompt += ''.join(f"### {m['role']}: {m['content']} \n" for m in messages)
    prompt += """
### Assistant:"""
    print(prompt)

    x = Inference()
    y =  x.run_inference.call(prompt)
    print(y)