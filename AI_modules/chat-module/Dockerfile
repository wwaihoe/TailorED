# Use an official NVIDIA CUDA base image
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

EXPOSE 8001

# Install Python 3 and development tools
RUN apt update 
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone
RUN apt install -y python3
RUN apt install -y python3-pip
RUN apt install gcc -y 

WORKDIR /code

COPY ./requirements.txt requirements.txt

RUN python3 -m pip install --upgrade pip

RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

RUN pip3 install --no-cache-dir --upgrade -r /code/requirements.txt

RUN CMAKE_ARGS="-DGGML_CUDA=on -DCMAKE_CUDA_ARCHITECTURES=75" pip install llama-cpp-python

COPY ./models models

COPY ./app app

WORKDIR /code/app

CMD ["fastapi", "run", "main.py", "--port", "8001"]