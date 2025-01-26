from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
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

class MCQWithID(BaseModel):
  id: int
  question: str
  option_a: str
  option_b: str
  option_c: str
  option_d: str
  correct_option: str

class SAQ(BaseModel):
  question: str
  correct_answer: str

class SAQWithID(BaseModel):
  id: int
  question: str
  correct_answer: str

class SaveMCQRequest(BaseModel):
  question_set_id: str
  topic: str
  mcqs: List[MCQ]

class SaveSAQRequest(BaseModel):
  question_set_id: str
  topic: str
  saqs: List[SAQ]

class Topic(BaseModel):
  question_set_id: str
  topic: str

class RetrieveTopicsResponse(BaseModel):
  topics: List[Topic]

class MCQFeedback(BaseModel):
  question_set_id: str
  question_id: int
  chosen_option: str
  feedback: str

class RetrieveMCQResponse(BaseModel):
  topic: str
  mcqs: List[MCQWithID]
  feedbacks: Optional[List[MCQFeedback]] = None

class SAQFeedback(BaseModel):
  question_set_id: str
  question_id: int
  input_answer: str
  feedback: str

class RetrieveSAQResponse(BaseModel):
  topic: str
  saqs: List[SAQWithID]
  feedbacks: Optional[List[SAQFeedback]] = None

class SaveMCQFeedbacksRequest(BaseModel):
  mcq_feedbacks: List[MCQFeedback]

class SaveSAQFeedbacksRequest(BaseModel):
  saq_feedbacks: List[SAQFeedback]


# Create MCQ table
conn.execute('CREATE TABLE IF NOT EXISTS mcq (id serial PRIMARY KEY, question_set_id text, topic text, question text, option_a text, option_b text, option_c text, option_d text, correct_option text)')
conn.commit()

# Create SAQ table
conn.execute('CREATE TABLE IF NOT EXISTS saq (id serial PRIMARY KEY, question_set_id text, topic text, question text, correct_answer text)')
conn.commit()

# Create MCQ Feedback table
conn.execute('CREATE TABLE IF NOT EXISTS mcq_feedback (id serial PRIMARY KEY, question_set_id text, question_id int REFERENCES mcq(id), chosen_option text, feedback text)')
conn.commit()

# Create SAQ Feedback table
conn.execute('CREATE TABLE IF NOT EXISTS saq_feedback (id serial PRIMARY KEY, question_set_id text, question_id int REFERENCES saq(id), input_answer text, feedback text)')
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
  
@app.post("/save_saq/")
def saq(save_saq_request: SaveSAQRequest):
  try:
    # Insert SAQ data
    for saq in save_saq_request.saqs:
      conn.execute(f'INSERT INTO saq (question_set_id, topic, question, correct_answer) VALUES (%s, %s, %s, %s)', (save_saq_request.question_set_id, save_saq_request.topic, saq.question, saq.correct_answer))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving SAQs")
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
    return RetrieveTopicsResponse(topics=topics)

  except Exception as e:
    print("Error in retrieving MCQ topics")
    print(e)
    return

@app.get("/retrieve_saq_topics/")
def retrieve_saq_topics():
  try:
    # Retrieve SAQ topics
    results = conn.execute('SELECT DISTINCT question_set_id, topic FROM saq').fetchall()
    topics = []
    for question_set_id, topic in results:
      topics.append({"question_set_id": question_set_id, "topic": topic})
    return RetrieveTopicsResponse(topics=topics)

  except Exception as e:
    print("Error in retrieving SAQ topics")
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
    results = conn.execute('SELECT question_id, chosen_option, feedback FROM mcq_feedback WHERE question_set_id = %s', (question_set_id,)).fetchall()
    mcq_feedbacks = []
    for question_id, chosen_option, feedback in results:
      mcq_feedbacks.append({"question_set_id": question_set_id, "question_id": question_id, "chosen_option": chosen_option, "feedback": feedback})
    return RetrieveMCQResponse(topic=topic, mcqs=mcqs, feedbacks=mcq_feedbacks if len(mcq_feedbacks) > 0 else None)

  except Exception as e:
    print("Error in retrieving MCQs")
    print(e)
    return

@app.get("/retrieve_saq/{question_set_id}/")
def retrieve_saq(question_set_id: str):
  try:
    # Retrieve Topic
    topic = conn.execute('SELECT topic FROM saq WHERE question_set_id = %s', (question_set_id,)).fetchone()[0]
    # Retrieve SAQs
    results = conn.execute('SELECT id, question, correct_answer FROM saq WHERE question_set_id = %s', (question_set_id,)).fetchall()
    saqs = []
    for id, question, correct_answer in results:
      saqs.append({"id": id, "question": question, "correct_answer": correct_answer})
    results = conn.execute('SELECT question_id, input_answer, feedback FROM saq_feedback WHERE question_set_id = %s', (question_set_id,)).fetchall()
    saq_feedbacks = []
    for question_id, input_answer, feedback in results:
      saq_feedbacks.append({"question_set_id": question_set_id, "question_id": question_id, "input_answer": input_answer, "feedback": feedback})
    return RetrieveSAQResponse(topic=topic, saqs=saqs, feedbacks=saq_feedbacks if len(saq_feedbacks) > 0 else None)

  except Exception as e:
    print("Error in retrieving SAQs")
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

@app.delete("/delete_saq/{question_set_id}/")
def delete_saq(question_set_id: int):
  try:
    # Delete SAQs
    conn.execute('DELETE FROM saq WHERE question_set_id = %s', (question_set_id,))
    conn.commit()
    return

  except Exception as e:
    print("Error in deleting SAQs")
    print(e)
    return

@app.post("/save_mcq_feedbacks/")
def save_mcq_feedbacks(save_mcq_feedbacks_request: SaveMCQFeedbacksRequest):
  try:
    # Delete any existing MCQ feedbacks
    print("Deleting existing MCQ feedbacks")
    conn.execute('DELETE FROM mcq_feedback WHERE question_set_id = %s', (save_mcq_feedbacks_request.mcq_feedbacks[0].question_set_id,))
    conn.commit()
    # Insert MCQ feedback data
    print("Inserting MCQ feedbacks")
    for mcq_feedback in save_mcq_feedbacks_request.mcq_feedbacks:
      conn.execute(f'INSERT INTO mcq_feedback (question_set_id, question_id, chosen_option, feedback) VALUES (%s, %s, %s, %s)', (mcq_feedback.question_set_id, mcq_feedback.question_id, mcq_feedback.chosen_option, mcq_feedback.feedback))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving MCQ feedbacks")
    print(e)
    return

@app.post("/save_saq_feedbacks/")
def save_saq_feedbacks(save_saq_feedbacks_request: SaveSAQFeedbacksRequest):
  try:
    # Delete any existing SAQ feedbacks
    print("Deleting existing SAQ feedbacks")
    conn.execute('DELETE FROM saq_feedback WHERE question_set_id = %s', (save_saq_feedbacks_request.saq_feedbacks[0].question_set_id,))
    conn.commit()
    # Insert SAQ feedback data
    print("Inserting SAQ feedbacks")
    for saq_feedback in save_saq_feedbacks_request.saq_feedbacks:
      conn.execute(f'INSERT INTO saq_feedback (question_set_id, question_id, input_answer, feedback) VALUES (%s, %s, %s, %s)', (saq_feedback.question_set_id, saq_feedback.question_id, saq_feedback.input_answer, saq_feedback.feedback))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving SAQ feedbacks")
    print(e)
    return


  
if __name__ == '__main__':
  uvicorn.run(app, port=8003, host='0.0.0.0')