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

class MCQ(BaseModel):
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

class EvaluateMCQRequest(BaseModel):
  mcq: MCQ
  chosen_option: str
  additional_info: bool | None=False

class EvaluateMCQsRequest(BaseModel):
  evaluate_mcqs_request: List[EvaluateMCQRequest]

class EvaluateSAQRequest(BaseModel):
  saq: SAQ
  input_answer: str
  additional_info: bool | None=False

class EvaluateSAQsRequest(BaseModel):
  evaluate_saqs_request: List[EvaluateSAQRequest]

class SummarizeRequest(BaseModel):
  notes: str
  topic: str
  examples: bool | None=False
  context: bool | None=False


@app.get("/")
def read_root():
  return {"Server": "On"}

@app.post("/chat/")
def get_response(chat_request: ChatRequest):
  response = qa_chain_model.generate(chat_request.messages)
  return ChatResponse(output=response["content"], filenames=response["filenames"])

@app.post("/generate_mcq/")
def generate_mcq(topic: Topic):
  mcq_groups = question_generator_model.generate_mcq(topic.topic)
  if mcq_groups is None:
    return
  question_set_id = str(uuid4())
  try:
    body = {"question_set_id": question_set_id, "topic": topic.topic, "mcqs": mcq_groups}
    print(body)
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_mcq/", json=body)
    if not response.ok:
      print("Error in saving MCQs")
      return 
  except Exception as e:
    print("Error in saving MCQs")
    print(e)
    return
  return

@app.post("/generate_saq/")
def generate_saq(topic: Topic):
  saq_groups = question_generator_model.generate_saq(topic.topic)
  return saq_groups

@app.post("/evaluate_mcq/")
def evaluate_mcq(evaluate_mcq_request: EvaluateMCQRequest):
  response = answer_evaluator_model.evaluate_mcq(evaluate_mcq_request.mcq, evaluate_mcq_request.chosen_option, evaluate_mcq_request.additional_info)
  return response

@app.post("/evaluate_mcqs/")
def evaluate_mcqs(evaluate_mcqs_request: EvaluateMCQsRequest):
  responses = []
  for evaluate_mcq_request in evaluate_mcqs_request.evaluate_mcqs_request:
    response = {}
    response["mcq"] = evaluate_mcq_request.mcq
    response["chosen_option"] = evaluate_mcq_request.chosen_option
    response["feedback"] = answer_evaluator_model.evaluate_mcq(evaluate_mcq_request.mcq, evaluate_mcq_request.chosen_option, evaluate_mcq_request.additional_info)
    responses.append(response)
  return {"responses": responses}

@app.post("/evaluate_saq/")
def evaluate_saq(evaluate_saq_request: EvaluateSAQRequest):
  response = answer_evaluator_model.evaluate_saq(evaluate_saq_request.saq, evaluate_saq_request.input_answer, evaluate_saq_request.additional_info)
  return response

@app.post("/evaluate_saqs/")
def evaluate_saqs(evaluate_saqs_request: EvaluateSAQsRequest):
  responses = []
  for evaluate_saq_request in evaluate_saqs_request.evaluate_saqs_request:
    response = answer_evaluator_model.evaluate_saq(evaluate_saq_request.saq, evaluate_saq_request.input_answer, evaluate_saq_request.additional_info)
    responses.append(response)  
  return responses

@app.post("/summarize/")
def summarize(summarize_request: SummarizeRequest):
  response = summarizer.summarize(summarize_request.notes, summarize_request.topic, summarize_request.examples, summarize_request.context)
  return response


if __name__ == '__main__':
  uvicorn.run(app, port=8001, host='0.0.0.0')