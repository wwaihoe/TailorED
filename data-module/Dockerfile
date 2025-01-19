FROM python:3.9

EXPOSE 8003

WORKDIR /code

RUN python3 -m pip install --upgrade pip

RUN pip install "psycopg[binary,pool]"

COPY ./requirements.txt requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app app

WORKDIR /code/app

CMD ["fastapi", "run", "main.py", "--port", "8003"]