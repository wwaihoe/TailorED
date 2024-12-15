# Use an official NVIDIA CUDA base image
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04 

# Install Python 3 and development tools
RUN apt update 
RUN ln -snf /usr/share/zoneinfo/$CONTAINER_TIMEZONE /etc/localtime && echo $CONTAINER_TIMEZONE > /etc/timezone
RUN apt install -y python3
RUN apt install -y python3-pip
RUN apt install -y python3-packaging
RUN apt install -y gcc  
RUN apt install -y git-all
RUN apt install -y ffmpeg

WORKDIR /app

COPY ./requirements.txt requirements.txt

RUN python3 -m pip install --upgrade pip

RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

RUN pip3 install --no-cache-dir --upgrade -r /app/requirements.txt

COPY ./app /app

CMD ["python3", "-u", "main.py"]