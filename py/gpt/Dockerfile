FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

ARG DEBIAN_FRONTEND=noninteractive

# install python and git lfs
RUN apt-get update && apt-get install -y \
    git \
    curl \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt install -y python3.10 \
    && apt install -y libpython3.10-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get install build-essential 
RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install git-lfs

# install python dependencies
WORKDIR /workspace
COPY requirements.txt requirements.txt
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.10 \
    && python3.10 -m pip install -r requirements.txt \
    && python3.10 -m pip install numpy --pre torch --index-url https://download.pytorch.org/whl/cu118

# install gptq
RUN mkdir repositories
RUN cd repositories && git clone https://github.com/qwopqwop200/GPTQ-for-LLaMa.git && cd GPTQ-for-LLaMa && pip install -r requirements.txt
WORKDIR /workspace/repositories/GPTQ-for-LLaMa

WORKDIR /workspace
COPY . .