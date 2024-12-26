from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import List
from chat_models import qa_chain_model, llm
from task_models import question_generator_model, answer_evaluator_model, summarizer


app = FastAPI()

origins = ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


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


@app.get("/")
def read_root():
  return {"Server": "On"}

@app.post("/chat")
def get_response(chat_request: ChatRequest):
  response = qa_chain_model.generate(chat_request.messages)
  return ChatResponse(output=response["content"], filenames=response["filenames"])

@app.post("/generate_mcq")
def generate_mcq(topic: str):
  mcq_groups = question_generator_model.generate_mcq(topic)
  return mcq_groups

@app.post("/generate_saq")
def generate_saq(topic: str):
  saq_groups = question_generator_model.generate_saq(topic)
  return saq_groups

@app.post("/evaluate_mcq")
def evaluate_answer(question: str, options: list[str], correct_answer: str, student_answer: str, additional_info: bool = False):
  response = answer_evaluator_model.evaluate_mcq(question, options, correct_answer, student_answer, additional_info)
  return response

@app.post("/evaluate_saq")
def evaluate_answer(question: str, model_answer: str, student_answer: str, additional_info: bool = False):
  response = answer_evaluator_model.evaluate_saq(question, model_answer, student_answer, additional_info)
  return response

@app.post("/summarize")
def summarize(notes: str, topic: str = None, examples: bool = False, context: bool = False):
  response = summarizer.summarize(notes, topic, examples, context)
  return response


if __name__ == '__main__':
  uvicorn.run(app, port=8001, host='0.0.0.0')