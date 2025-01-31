# Use an official NVIDIA CUDA base image
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

RUN apt update
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone
RUN apt install -y build-essential
RUN apt install -y cmake
RUN apt install -y gcc
RUN apt install -y git-all
RUN apt install -y python3
RUN apt install -y python3-pip
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python3 -m pip install --upgrade pip
RUN pip install packaging ninja
RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
RUN pip install flash-attn --no-build-isolation

RUN git clone https://github.com/ggerganov/llama.cpp
WORKDIR /app/llama.cpp
RUN cmake -B build -DGGML_CUDA=ON
RUN cmake --build build --config Release

WORKDIR /app/llama.cpp/build/bin/Release

CMD ["llama-server", "-m", "/models/Qwen2.5-3B-Instruct-Q6_K.gguf", \
     "--host", "0.0.0.0", "--port", "8002", \
     "--n-gpu-layers", "999", "--ctx-size", "4096" , "-fa"]