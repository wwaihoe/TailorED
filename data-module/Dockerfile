FROM python:3.9

WORKDIR /code

COPY ./requirements.txt requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app app

CMD ["fastapi", "run", "app/main.py", "--port", "8003"]