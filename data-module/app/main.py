from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg


app = FastAPI()

origins = ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)
# Setup postgres
#host="localhost"
host="db"
port="5432"
dbname="database"
user="postgres"
password="admin"
conn = psycopg.connect(f"host={host} port={port} dbname={dbname} user={user} password={password}")


class MCQ(BaseModel):
  question: str
  option_a: str
  option_b: str
  option_c: str
  option_d: str
  correct_option: str

class SaveMCQRequest(BaseModel):
  question_set_id: str
  topic: str
  mcqs: list[MCQ]

class RetrieveMCQRequest(BaseModel):
  question_set_id: int

# Create MCQ table
conn.execute('CREATE TABLE IF NOT EXISTS mcq (id serial PRIMARY KEY, question_set_id text, topic text, question text, option_a text, option_b text, option_c text, option_d text, correct_option text)')
conn.commit()

@app.post("/save_mcq/")
def mcq(save_mcq_request: SaveMCQRequest):
  try:
    # Insert MCQ data
    for mcq in save_mcq_request.mcqs:
      conn.execute(f'INSERT INTO mcq (question_set_id, topic, question, option_a, option_b, option_c, option_d, correct_option) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)', (save_mcq_request.question_set_id, save_mcq_request.topic, mcq.question, mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d, mcq.correct_option))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving MCQs")
    print(e)
    return
  
@app.get("/retrieve_mcq_topics/")
def retrieve_mcq_topics():
  try:
    # Retrieve MCQ topics
    results = conn.execute('SELECT DISTINCT question_set_id, topic FROM mcq').fetchall()
    topics = []
    for question_set_id, topic in results:
      topics.append({"question_set_id": question_set_id, "topic": topic})
    return {"topics": topics}

  except Exception as e:
    print("Error in retrieving MCQ topics")
    print(e)
    return

@app.get("/retrieve_mcq/{question_set_id}/")
def retrieve_mcq(question_set_id: str):
  try:
    # Retrieve Topic
    topic = conn.execute('SELECT topic FROM mcq WHERE question_set_id = %s', (question_set_id,)).fetchone()[0]
    # Retrieve MCQs
    results = conn.execute('SELECT id, question, option_a, option_b, option_c, option_d, correct_option FROM mcq WHERE question_set_id = %s', (question_set_id,)).fetchall()
    mcqs = []
    for id, question, option_a, option_b, option_c, option_d, correct_option in results:
      mcqs.append({"id": id, "question": question, "option_a": option_a, "option_b": option_b, "option_c": option_c, "option_d": option_d, "correct_option": correct_option})
    return {"topic": topic, "mcqs": mcqs}

  except Exception as e:
    print("Error in retrieving MCQs")
    print(e)
    return

@app.delete("/delete_mcq/{question_set_id}/")
def delete_mcq(question_set_id: int):
  try:
    # Delete MCQs
    conn.execute('DELETE FROM mcq WHERE question_set_id = %s', (question_set_id,))
    conn.commit()
    return

  except Exception as e:
    print("Error in deleting MCQs")
    print(e)
    return

  
if __name__ == '__main__':
  uvicorn.run(app, port=8003, host='0.0.0.0')