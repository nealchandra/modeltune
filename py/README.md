## Setup

Clone the repo and ([install conda](https://docs.conda.io/en/latest/miniconda.html).

Run the following commands:

```
conda create -n llama
conda activate llama
conda install torchvision torchaudio pytorch-cuda=11.7 git -c pytorch -c nvidia
pip install -r requirements.txt
```

The third line assumes that you have an NVIDIA GPU.

- If you have an AMD GPU, replace the third command with this one:

```
pip3 install torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/rocm5.2
```

## Run

```
python ./cli.py --help
```
