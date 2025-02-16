from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
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


class Message(BaseModel):
  timestamp: datetime
  role: str
  content: str

class SaveMessageRequest(BaseModel):
  chat_id: str
  timestamp: datetime
  role: str
  content: str

class Chat(BaseModel):
  chat_id: str
  timestamp: datetime
  role: str
  content: str

class RetrieveChatsResponse(BaseModel):
  chats: List[Chat]

class RetrieveMessagesResponse(BaseModel):
  messages: List[Message]

class MCQ(BaseModel):
  question: str
  option_a: str
  option_b: str
  option_c: str
  option_d: str
  reason: str
  correct_option: str

class MCQWithID(BaseModel):
  id: int
  question: str
  option_a: str
  option_b: str
  option_c: str
  option_d: str
  reason: str
  correct_option: str

class SAQ(BaseModel):
  question: str
  reason: str
  correct_answer: str

class SAQWithID(BaseModel):
  id: int
  question: str
  reason: str
  correct_answer: str

class SaveMCQRequest(BaseModel):
  question_set_id: str
  topic: str
  mcqs: List[MCQ]

class SaveSAQRequest(BaseModel):
  question_set_id: str
  topic: str
  saqs: List[SAQ]

class QTopic(BaseModel):
  question_set_id: str
  topic: str
  image_prompt: Optional[str] = None

class RetrieveQTopicsResponse(BaseModel):
  topics: List[QTopic]

class MCQFeedback(BaseModel):
  question_set_id: str
  question_id: int
  chosen_option: str
  feedback: str

class RetrieveMCQResponse(BaseModel):
  topic: str
  mcqs: List[MCQWithID]
  feedbacks: Optional[List[MCQFeedback]] = None
  num_correct: Optional[int] = None

class SAQFeedback(BaseModel):
  question_set_id: str
  question_id: int
  input_answer: str
  feedback: str
  score: int

class RetrieveSAQResponse(BaseModel):
  topic: str
  saqs: List[SAQWithID]
  feedbacks: Optional[List[SAQFeedback]] = None
  total_score: Optional[int] = None

class SaveMCQFeedbacksRequest(BaseModel):
  mcq_feedbacks: List[MCQFeedback]
  num_correct: int

class SaveSAQFeedbacksRequest(BaseModel):
  saq_feedbacks: List[SAQFeedback]
  total_score: int

class SaveSummaryRequest(BaseModel):
  topic: str
  summary: str

class SummaryTopic(BaseModel):
  id: int
  topic: str
  image_prompt: Optional[str] = None

class RetrieveSummaryTopicsResponse(BaseModel):
  topics: List[SummaryTopic]

class RetrieveSummaryResponse(BaseModel):
  topic: str
  summary: str

class RetrieveAllTopicsResponse(BaseModel):
  topics: List[str]

class MCQScore(BaseModel):
  topic: str
  num_questions: int
  num_correct: int

class SAQScore(BaseModel):
  topic: str
  max_score: int
  total_score: int

class RetrieveAllScoresResponse(BaseModel):
  mcq_scores: List[MCQScore]
  saq_scores: List[SAQScore]

class SaveStudyPlanRequest(BaseModel):
  timestamp: datetime
  study_plan: str

class RetrieveStudyPlanResponse(BaseModel):
  timestamp: Optional[datetime] = None
  study_plan: Optional[str] = None

class SaveImagePromptRequest(BaseModel):
  topic: str
  image_prompt: str

class RetrieveImagePromptResponse(BaseModel):
  topic: str
  image_prompt: str


# Create Message table
conn.execute("""CREATE TABLE IF NOT EXISTS message (
             id serial PRIMARY KEY,
             chat_id text,
             timestamp timestamp,
             role text,
             content text);""")

# Create MCQ table
conn.execute("""CREATE TABLE IF NOT EXISTS mcq (
             id serial PRIMARY KEY, 
             question_set_id text, 
             topic text, 
             question text, 
             option_a text, 
             option_b text, 
             option_c text, 
             option_d text, 
             correct_option text, 
             reason text);""")

# Create SAQ table
conn.execute("""CREATE TABLE IF NOT EXISTS saq (
             id serial PRIMARY KEY, 
             question_set_id text, 
             topic text, 
             question text, 
             correct_answer text, 
             reason text);""")

# Create MCQ Feedback table
conn.execute("""CREATE TABLE IF NOT EXISTS mcq_feedback (
             id serial PRIMARY KEY, 
             question_set_id text, 
             question_id int REFERENCES mcq(id) ON DELETE CASCADE, 
             chosen_option text, 
             feedback text);""")

# Create SAQ Feedback table
conn.execute("""CREATE TABLE IF NOT EXISTS saq_feedback (
             id serial PRIMARY KEY, 
             question_set_id text,
             question_id int REFERENCES saq(id) ON DELETE CASCADE, 
             input_answer text, 
             feedback text,
             score int);""")

# Create MCQ scores table
conn.execute("""CREATE TABLE IF NOT EXISTS mcq_scores (
             id serial PRIMARY KEY, 
             question_set_id text,
             num_questions int,
             num_correct int);""")

# Create SAQ scores table
conn.execute("""CREATE TABLE IF NOT EXISTS saq_scores (
             id serial PRIMARY KEY,
             question_set_id text, 
             max_score int,
             total_score int);""")

# Create summary table
conn.execute("""CREATE TABLE IF NOT EXISTS summary (
             id serial PRIMARY KEY, 
             topic text, 
             summary text);""")

# Create study plan table
conn.execute("""CREATE TABLE IF NOT EXISTS study_plan (
             id serial PRIMARY KEY, 
             timestamp timestamp, 
             study_plan text);""")

# Create image prompt table
conn.execute("""CREATE TABLE IF NOT EXISTS image_prompt (
             topic text PRIMARY KEY, 
             image_prompt text);""")

conn.commit()


@app.post("/save_message/")
def save_message(save_message_request: SaveMessageRequest):
  try:
    # Insert message data
    conn.execute(f'INSERT INTO message (chat_id, timestamp, role, content) VALUES (%s, %s, %s, %s)', (save_message_request.chat_id, save_message_request.timestamp, save_message_request.role, save_message_request.content))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving message")
    print(e)
    return
  

@app.get("/retrieve_chats/")
def retrieve_chats():
  try:
    # Retrieve first message from each chat
    results = conn.execute('SELECT chat_id, message.timestamp, role, content FROM message JOIN (SELECT MIN(timestamp) AS timestamp FROM message GROUP BY chat_id) message_ts ON message.timestamp = message_ts.timestamp ORDER BY message.timestamp DESC').fetchall()
    chats = [{"chat_id": chat_id, "timestamp": timestamp, "role": role, "content": content} for chat_id, timestamp, role, content in results]
    return RetrieveChatsResponse(chats=chats)
  
  except Exception as e:
    print("Error in retrieving chats")
    print(e)
    return
  

@app.get("/retrieve_messages/{chat_id}/")
def retrieve_messages(chat_id: str):
  try:
    # Retrieve messages
    results = conn.execute('SELECT timestamp, role, content FROM message WHERE chat_id = %s ORDER BY timestamp', (chat_id,)).fetchall()
    messages = [{"timestamp": timestamp, "role": role, "content": content} for timestamp, role, content in results]
    return RetrieveMessagesResponse(messages=messages)

  except Exception as e:
    print("Error in retrieving messages")
    print(e)
    return
  

@app.delete("/delete_chat/{chat_id}/")
def delete_chat(chat_id: str):
  try:
    # Delete chat
    conn.execute('DELETE FROM message WHERE chat_id = %s', (chat_id,))
    conn.commit()
    return

  except Exception as e:
    print("Error in deleting chat")
    print(e)
    return
    

@app.post("/save_mcq/")
def save_mcq(save_mcq_request: SaveMCQRequest):
  try:
    # Insert MCQ data
    for mcq in save_mcq_request.mcqs:
      conn.execute(f'INSERT INTO mcq (question_set_id, topic, question, option_a, option_b, option_c, option_d, correct_option, reason) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)', (save_mcq_request.question_set_id, save_mcq_request.topic, mcq.question, mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d, mcq.correct_option, mcq.reason))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving MCQs")
    print(e)
    return
  
  
@app.post("/save_saq/")
def save_saq(save_saq_request: SaveSAQRequest):
  try:
    # Insert SAQ data
    for saq in save_saq_request.saqs:
      conn.execute(f'INSERT INTO saq (question_set_id, topic, question, correct_answer, reason) VALUES (%s, %s, %s, %s, %s)', (save_saq_request.question_set_id, save_saq_request.topic, saq.question, saq.correct_answer, saq.reason))
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
    results = conn.execute('SELECT DISTINCT mcq.question_set_id, mcq.topic, image_prompt.image_prompt FROM mcq JOIN image_prompt ON mcq.topic = image_prompt.topic').fetchall()
    topics = [{"question_set_id": question_set_id, "topic": topic, "image_prompt": image_prompt} for question_set_id, topic, image_prompt in results]
    return RetrieveQTopicsResponse(topics=topics)

  except Exception as e:
    print("Error in retrieving MCQ topics")
    print(e)
    return
  

@app.get("/retrieve_saq_topics/")
def retrieve_saq_topics():
  try:
    # Retrieve SAQ topics
    results = conn.execute('SELECT DISTINCT saq.question_set_id, saq.topic, image_prompt.image_prompt FROM saq JOIN image_prompt ON saq.topic = image_prompt.topic').fetchall()
    topics = [{"question_set_id": question_set_id, "topic": topic, "image_prompt": image_prompt} for question_set_id, topic, image_prompt in results]
    return RetrieveQTopicsResponse(topics=topics)

  except Exception as e:
    print("Error in retrieving SAQ topics")
    print(e)
    return
  

@app.get("/retrieve_mcq/{question_set_id}/")
def retrieve_mcq(question_set_id: str):
  try:
    # Retrieve Topic
    topic = conn.execute('SELECT topic FROM mcq WHERE question_set_id = %s', (question_set_id,)).fetchone()
    if topic is None:
      return RetrieveMCQResponse(topic="", mcqs=[], feedbacks=None)
    else:
      topic = topic[0]
    # Retrieve MCQs
    results = conn.execute('SELECT id, question, option_a, option_b, option_c, option_d, correct_option, reason FROM mcq WHERE question_set_id = %s', (question_set_id,)).fetchall()
    mcqs = []
    for id, question, option_a, option_b, option_c, option_d, correct_option, reason in results:
      mcqs.append({"id": id, "question": question, "option_a": option_a, "option_b": option_b, "option_c": option_c, "option_d": option_d, "correct_option": correct_option, "reason": reason})
    results = conn.execute('SELECT question_id, chosen_option, feedback FROM mcq_feedback WHERE question_set_id = %s', (question_set_id,)).fetchall()
    mcq_feedbacks = []
    for question_id, chosen_option, feedback in results:
      mcq_feedbacks.append({"question_set_id": question_set_id, "question_id": question_id, "chosen_option": chosen_option, "feedback": feedback})
    result = conn.execute('SELECT num_correct FROM mcq_scores WHERE question_set_id = %s', (question_set_id,)).fetchone()
    num_correct = result[0] if result is not None else None
    return RetrieveMCQResponse(topic=topic, mcqs=mcqs, feedbacks=mcq_feedbacks if len(mcq_feedbacks) > 0 else None, num_correct=num_correct)

  except Exception as e:
    print("Error in retrieving MCQs")
    print(e)
    return
  

@app.get("/retrieve_saq/{question_set_id}/")
def retrieve_saq(question_set_id: str):
  try:
    # Retrieve Topic
    topic = conn.execute('SELECT topic FROM saq WHERE question_set_id = %s', (question_set_id,)).fetchone()
    if topic is None:
      return RetrieveSAQResponse(topic="", saqs=[], feedbacks=None, total_score=None)
    else:
      topic = topic[0]
    # Retrieve SAQs
    results = conn.execute('SELECT id, question, correct_answer, reason FROM saq WHERE question_set_id = %s', (question_set_id,)).fetchall()
    saqs = []
    for id, question, correct_answer, reason in results:
      saqs.append({"id": id, "question": question, "correct_answer": correct_answer, "reason": reason})
    results = conn.execute('SELECT question_id, input_answer, feedback, score FROM saq_feedback WHERE question_set_id = %s', (question_set_id,)).fetchall()
    saq_feedbacks = []
    for question_id, input_answer, feedback, score in results:
      saq_feedbacks.append({"question_set_id": question_set_id, "question_id": question_id, "input_answer": input_answer, "feedback": feedback, "score": score})
    result = conn.execute('SELECT total_score FROM saq_scores WHERE question_set_id = %s', (question_set_id,)).fetchone()
    total_score = result[0] if result is not None else None
    return RetrieveSAQResponse(topic=topic, saqs=saqs, feedbacks=saq_feedbacks if len(saq_feedbacks) > 0 else None, total_score=total_score)

  except Exception as e:
    print("Error in retrieving SAQs")
    print(e)
    return
  

@app.delete("/delete_mcq/{question_set_id}/")
def delete_mcq(question_set_id: str):
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
def delete_saq(question_set_id: str):
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
    # Insert MCQ score
    conn.execute('INSERT INTO mcq_scores (question_set_id, num_questions, num_correct) VALUES (%s, %s, %s)', (save_mcq_feedbacks_request.mcq_feedbacks[0].question_set_id, len(save_mcq_feedbacks_request.mcq_feedbacks), save_mcq_feedbacks_request.num_correct))
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
      conn.execute(f'INSERT INTO saq_feedback (question_set_id, question_id, input_answer, feedback, score) VALUES (%s, %s, %s, %s, %s)', (saq_feedback.question_set_id, saq_feedback.question_id, saq_feedback.input_answer, saq_feedback.feedback, saq_feedback.score))
    conn.commit()
    # Insert SAQ score
    conn.execute('INSERT INTO saq_scores (question_set_id, max_score, total_score) VALUES (%s, %s, %s)', (save_saq_feedbacks_request.saq_feedbacks[0].question_set_id, 5*len(save_saq_feedbacks_request.saq_feedbacks), save_saq_feedbacks_request.total_score))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving SAQ feedbacks")
    print(e)
    return
  

@app.post("/save_summary/")
def save_summary(save_summary_request: SaveSummaryRequest):
  try:
    # Insert summary data
    conn.execute(f'INSERT INTO summary (topic, summary) VALUES (%s, %s)', (save_summary_request.topic, save_summary_request.summary))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving summary")
    print(e)
    return
  
  
@app.get("/retrieve_summary_topics/")
def retrieve_summary_topics():
  try:
    # Retrieve summaries
    results = conn.execute('SELECT summary.id, summary.topic, image_prompt.image_prompt FROM summary JOIN image_prompt ON summary.topic = image_prompt.topic').fetchall() 
    topics = [{"id": id, "topic": topic, "image_prompt": image_prompt} for id, topic, image_prompt in results]
    return RetrieveSummaryTopicsResponse(topics=topics)

  except Exception as e:
    print("Error in retrieving summaries")
    print(e)
    return
  
  
@app.get("/retrieve_summary/{summary_id}/")
def retrieve_summary(summary_id: int):
  try:
    # Retrieve summary
    summary = conn.execute('SELECT topic, summary FROM summary WHERE id = %s', (summary_id,)).fetchone()
    if summary is None:
      return RetrieveSummaryResponse(topic="", summary="")
    else:
      return RetrieveSummaryResponse(topic=summary[0], summary=summary[1])

  except Exception as e:
    print("Error in retrieving summary")
    print(e)
    return
  

@app.delete("/delete_summary/{summary_id}/")
def delete_summary(summary_id: int):
  try:
    # Delete summary
    conn.execute('DELETE FROM summary WHERE id = %s', (summary_id,))
    conn.commit()
    return

  except Exception as e:
    print("Error in deleting summary")
    print(e)
    return
  

@app.get("/retrieve_all_topics/")
def retrieve_all_topics():
  try:
    topics = set()
    # Retrieve MCQ topics
    results = conn.execute('SELECT DISTINCT topic FROM mcq').fetchall()
    topics.update([topic[0] for topic in results])
    # Retrieve SAQ topics
    results = conn.execute('SELECT DISTINCT topic FROM saq').fetchall()
    topics.update([topic[0] for topic in results])
    # Retrieve summary topics
    results = conn.execute('SELECT topic FROM summary').fetchall()
    topics.update([topic[0] for topic in results])
    topics = list(topics)
    return RetrieveAllTopicsResponse(topics=topics)

  except Exception as e:
    print("Error in retrieving all topics")
    print(e)
    return
  

@app.get("/retrieve_all_scores/")
def retrieve_all_scores():
  try:
    # Retrieve MCQ scores
    results = conn.execute('SELECT mcq_scores.question_set_id, distinct_mcq.topic, mcq_scores.num_questions, mcq_scores.num_correct FROM mcq_scores JOIN (SELECT DISTINCT topic, question_set_id FROM mcq) distinct_mcq ON mcq_scores.question_set_id = distinct_mcq.question_set_id').fetchall()
    mcq_scores = [{"topic": topic, "num_questions": num_questions, "num_correct": num_correct} for question_set_id, topic, num_questions, num_correct in results]
    # Retrieve SAQ scores
    results = conn.execute('SELECT saq_scores.question_set_id, distinct_saq.topic, saq_scores.max_score, saq_scores.total_score FROM saq_scores JOIN (SELECT DISTINCT topic, question_set_id FROM saq) distinct_saq ON saq_scores.question_set_id = distinct_saq.question_set_id').fetchall()
    saq_scores = [{"topic": topic, "max_score": max_score, "total_score": total_score} for question_set_id, topic, max_score, total_score in results]
    return RetrieveAllScoresResponse(mcq_scores=mcq_scores, saq_scores=saq_scores)
  
  except Exception as e:
    print("Error in retrieving all scores")
    print(e)
    return
  

@app.post("/save_study_plan/")
def save_study_plan(save_study_plan_request: SaveStudyPlanRequest):
  try:
    # Insert study plan data
    conn.execute(f'INSERT INTO study_plan (timestamp, study_plan) VALUES (%s, %s)', (save_study_plan_request.timestamp, save_study_plan_request.study_plan))
    return

  except Exception as e:
    print("Error in saving study plan")
    print(e)
    return
  

@app.get("/retrieve_study_plan/")
def retrieve_study_plan():
  try:
    # Retrieve latest study plan
    results = conn.execute('SELECT timestamp, study_plan FROM study_plan ORDER BY timestamp DESC LIMIT 1').fetchall()
    return RetrieveStudyPlanResponse(timestamp=results[0][0] if len(results) > 0 else None, study_plan=results[0][1] if len(results) > 0 else None)

  except Exception as e:
    print("Error in retrieving study plan")
    print(e)
    return

  
@app.post("/save_image_prompt/")
def save_image_prompt(save_image_prompt_request: SaveImagePromptRequest):
  try:
    # Delete existing image prompt
    conn.execute('DELETE FROM image_prompt WHERE topic = %s', (save_image_prompt_request.topic,))
    conn.commit()
    # Insert image prompt data
    conn.execute(f'INSERT INTO image_prompt (topic, image_prompt) VALUES (%s, %s)', (save_image_prompt_request.topic, save_image_prompt_request.image_prompt))
    conn.commit()
    return

  except Exception as e:
    print("Error in saving image prompt")
    print(e)
    return
  
  
@app.get("/retrieve_image_prompt/{topic}/")
def retrieve_image_prompt(topic: str):
  try:
    # Retrieve image prompt
    image_prompt = conn.execute('SELECT topic, image_prompt FROM image_prompt WHERE topic = %s', (topic,)).fetchone()
    if image_prompt is None:
      return RetrieveImagePromptResponse(topic=topic, image_prompt="")
    else:
      return RetrieveImagePromptResponse(topic=topic, image_prompt=image_prompt[1])

  except Exception as e:
    print("Error in retrieving image prompt")
    print(e)
    return
  

@app.delete("/delete_image_prompt/{topic}/")
def delete_image_prompt(topic: str):
  try:
    # Delete image prompt
    conn.execute('DELETE FROM image_prompt WHERE topic = %s', (topic,))
    conn.commit()
    return

  except Exception as e:
    print("Error in deleting image prompt")
    print(e)
    return

  
if __name__ == '__main__':
  uvicorn.run(app, port=8003, host='0.0.0.0')