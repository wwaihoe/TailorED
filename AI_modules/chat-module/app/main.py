from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import List
from chat_models import qa_chain_model, llm
from task_models import question_generator_model, answer_evaluator_model, summarizer
from uuid import uuid4
import requests


app = FastAPI()

origins = ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


datamodule_name = "localhost"
datamodule_port = "8003"


class Message(BaseModel):
  role: str
  content: str

class ChatRequest(BaseModel):
  messages: List[Message]

class MessageWithReason(BaseModel):
  reason: str
  answer: str

class ChatResponse(BaseModel):
  output: MessageWithReason
  filenames: list[str]

class Topic(BaseModel):
  topic: str

class EvaluateMCQRequest(BaseModel):
  question: str
  options: list[str]
  correct_answer: str
  student_answer: str
  additional_info: bool=False

class EvaluateSAQRequest(BaseModel):
  question: str
  model_answer: str
  student_answer: str
  additional_info: bool=False

class SummarizeRequest(BaseModel):
  notes: str
  topic: str
  examples: bool=False
  context: bool=False


@app.get("/")
def read_root():
  return {"Server": "On"}

@app.post("/chat/")
def get_response(chat_request: ChatRequest):
  response = qa_chain_model.generate(chat_request.messages)
  return ChatResponse(output=response["content"], filenames=response["filenames"])

@app.post("/generatemcq/")
def generate_mcq(topic: Topic):
  mcq_groups = question_generator_model.generate_mcq(topic.topic)
  if mcq_groups is None:
    return None
  question_set_id = str(uuid4())
  try:
    body = {"question_set_id": question_set_id, "topic": topic.topic, "mcqs": mcq_groups}
    print(body)
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_mcq/", json=body)
    if not response.ok:
      print("Error in saving MCQs")
      return None
  except Exception as e:
    print("Error in saving MCQs")
    print(e)
    return None
  return mcq_groups

@app.post("/generatesaq/")
def generate_saq(topic: Topic):
  saq_groups = question_generator_model.generate_saq(topic.topic)
  return saq_groups

@app.post("/evaluatemcq/")
def evaluate_answer(evaluate_mcq_request: EvaluateMCQRequest):
  response = answer_evaluator_model.evaluate_mcq(evaluate_mcq_request.question, evaluate_mcq_request.options, evaluate_mcq_request.correct_answer, evaluate_mcq_request.student_answer, evaluate_mcq_request.additional_info)
  return response

@app.post("/evaluatesaq/")
def evaluate_answer(evaluate_saq_request: EvaluateSAQRequest):
  response = answer_evaluator_model.evaluate_saq(evaluate_saq_request.question, evaluate_saq_request.model_answer, evaluate_saq_request.student_answer, evaluate_saq_request.additional_info)
  return response

@app.post("/summarize/")
def summarize(summarize_request: SummarizeRequest):
  response = summarizer.summarize(summarize_request.notes, summarize_request.topic, summarize_request.examples, summarize_request.context)
  return response


if __name__ == '__main__':
  uvicorn.run(app, port=8001, host='0.0.0.0')