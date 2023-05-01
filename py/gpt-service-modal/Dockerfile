FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

# install python and git lfs
RUN apt-get update && apt-get install -y python3-pip git curl software-properties-common \
    && apt-get install build-essential 

# install python dependencies
WORKDIR /workspace

COPY requirements.modal.txt requirements.txt

RUN ln -s /usr/bin/python3 /usr/bin/python

ENV TORCH_CUDA_ARCH_LIST="6.0 6.1 7.0 7.5 8.0 8.6"
RUN pip install numpy --pre torch --index-url https://download.pytorch.org/whl/cu118 
RUN pip install -r requirements.txt