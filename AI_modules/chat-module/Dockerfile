# Use an official NVIDIA CUDA base image
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

EXPOSE 8001

# Install Python 3 and development tools
RUN apt update 
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone
RUN apt install -y python3
RUN apt install -y python3-pip
RUN apt install gcc -y 
RUN apt install git -y

WORKDIR /code

COPY ./requirements.txt requirements.txt

RUN python3 -m pip install --upgrade pip

RUN pip3 install --no-cache-dir --upgrade -r /code/requirements.txt

RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

RUN MAX_JOBS=4 pip install flash-attn --no-build-isolation

RUN CMAKE_ARGS="-DGGML_CUDA=on -DCMAKE_CUDA_ARCHITECTURES=86" pip install llama-cpp-python
#RUN pip3 install llama-cpp-python \
#  --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu124

COPY ./models models

COPY ./app app

WORKDIR /code/app

CMD ["fastapi", "run", "main.py", "--port", "8001"]