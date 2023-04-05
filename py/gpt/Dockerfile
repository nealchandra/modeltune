FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

ARG DEBIAN_FRONTEND=noninteractive

# install python
RUN apt-get update && apt-get install -y \
    git \
    curl \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt install -y python3.10 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# install python dependencies
COPY requirements.txt requirements.txt
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10 \
    && python3.10 -m pip install -r requirements.txt \
    && python3.10 -m pip install numpy --pre torch --force-reinstall --index-url https://download.pytorch.org/whl/nightly/cu118

# install gptq
RUN mkdir repositories
RUN cd repositories && git clone https://github.com/qwopqwop200/GPTQ-for-LLaMa.git && cd GPTQ-for-LLaMa && git fetch origin a6f363e3f93b9fb5c26064b5ac7ed58d22e3f773 && git checkout a6f363e3f93b9fb5c26064b5ac7ed58d22e3f773 && git switch -c cuda-stable
RUN python3.10 setup_cuda.py install

# download models
WORKDIR /models
RUN \
  apt-get update && \
  apt-get install -y sudo curl git && \
  curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash && \
  sudo apt-get install git-lfs=1.0.0 && \
  mkdir -p /src 

RUN if [ ! -d "/models/vicuna-13b-int4" ]; then git clone https://huggingface.co/elinas/vicuna-13b-4bit

COPY . .