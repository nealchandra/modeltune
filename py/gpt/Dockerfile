FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

ARG DEBIAN_FRONTEND=noninteractive

# install python and git lfs
RUN apt-get update && apt-get install -y python3-pip git curl software-properties-common \
    && apt-get install build-essential 
RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash && \
    apt-get install git-lfs

# install python dependencies
WORKDIR /workspace

COPY requirements.txt requirements.txt

ENV TORCH_CUDA_ARCH_LIST="6.0 6.1 7.0 7.5 8.0 8.6"
RUN pip3 install --upgrade pip
RUN pip install numpy --pre torch --index-url https://download.pytorch.org/whl/cu118 
RUN pip install -r requirements.txt

COPY . .