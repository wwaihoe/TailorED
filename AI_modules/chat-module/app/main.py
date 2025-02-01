from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from chat_models import qa_chain_model, llm
from task_models import question_generator_model, answer_evaluator_model, summarizer, image_prompt_generator
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


datamodule_name = "data-module"
#datamodule_name = "localhost"
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
  filenames: List[str]

class Difficulty(Enum):
  easy = 1
  medium = 2
  hard = 3

class GenerateMCQRequest(BaseModel):
  topic: str
  difficulty: int

class GenerateSAQRequest(BaseModel):
  topic: str
  difficulty: int

class MCQ(BaseModel):
  id: int
  question: str
  option_a: str
  option_b: str
  option_c: str
  option_d: str
  reason: str
  correct_option: str

class SAQ(BaseModel):
  id: int
  question: str
  reason: str
  correct_answer: str

class EvaluateMCQRequest(BaseModel):
  mcq: MCQ
  chosen_option: str
  additional_info: Optional[bool] = False

class EvaluateMCQsRequest(BaseModel):
  question_set_id: str
  evaluate_mcqs_request: List[EvaluateMCQRequest]

class EvaluateMCQsResponse(BaseModel):
  mcq: MCQ
  chosen_option: str
  feedback: str

class EvaluateMCQsResponses(BaseModel):
  responses: List[EvaluateMCQsResponse]

class EvaluateSAQRequest(BaseModel):
  saq: SAQ
  input_answer: str
  additional_info: Optional[bool] = False

class EvaluateSAQsRequest(BaseModel):
  question_set_id: str
  evaluate_saqs_request: List[EvaluateSAQRequest]

class EvaluateSAQsResponse(BaseModel):
  saq: SAQ
  input_answer: str
  feedback: str

class EvaluateSAQsResponses(BaseModel):
  responses: List[EvaluateSAQsResponse]

class SummarizeRequest(BaseModel):
  topic: Optional[str] = None
  examples: Optional[bool] = False
  context: Optional[bool] = False

class GenerateImagePromptRequest(BaseModel):
  topic: str


@app.get("/")
def read_root():
  return {"Server": "On"}

@app.post("/chat/")
def get_response(chat_request: ChatRequest):
  response = qa_chain_model.generate(chat_request.messages)
  return ChatResponse(output=response["content"], filenames=response["filenames"])

@app.post("/generate_mcq/")
def generate_mcq(generate_mcq_request: GenerateMCQRequest):
  if generate_mcq_request.difficulty < 1 or generate_mcq_request.difficulty > 3:
    raise HTTPException(status_code=400, detail="Invalid difficulty level")
  difficulty = Difficulty(generate_mcq_request.difficulty)
  mcq_groups = question_generator_model.generate_mcq(generate_mcq_request.topic, difficulty)
  if mcq_groups is None:
    raise HTTPException(status_code=500, detail="Failed to generate MCQs")
  question_set_id = str(uuid4())
  try:
    body = {"question_set_id": question_set_id, "topic": generate_mcq_request.topic, "mcqs": mcq_groups}
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_mcq/", json=body)
    if not response.ok:
      print("Error in saving MCQs")
      raise HTTPException(status_code=500, detail="Error in saving MCQs")
    else:
      try:
        # Check if image prompt already exists
        response = requests.get(f"http://{datamodule_name}:{datamodule_port}/retrieve_image_prompt/{generate_mcq_request.topic}/")
        if response.ok:
          if response.json()["image_prompt"] != "":
            return
        # Generate image prompt
        image_prompt = image_prompt_generator.generate_image_prompt(generate_mcq_request.topic)
        if image_prompt is None:
          print("Error in generating image prompt")
          raise HTTPException(status_code=500, detail="Error in generating image prompt")
        else:
          try:
            body = {"topic": generate_mcq_request.topic, "image_prompt": image_prompt}
            response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_image_prompt/", json=body)
            if not response.ok:
              print("Error in saving image prompt")
              raise HTTPException(status_code=500, detail="Error in saving image prompt")
          except Exception as e:
            print("Error in saving image prompt")
            print(e)
            raise HTTPException(status_code=500, detail="Error in saving image prompt")
      except Exception as e:
        print("Error in generating image prompt")
        print(e)
        raise HTTPException(status_code=500, detail="Error in generating image prompt")
  except Exception as e:
    print("Error in saving MCQs")
    print(e)
    raise HTTPException(status_code=500, detail="Error in saving MCQs")
  return

@app.post("/generate_saq/")
def generate_saq(generate_saq_request: GenerateSAQRequest):
  if generate_saq_request.difficulty < 1 or generate_saq_request.difficulty > 3:
    raise HTTPException(status_code=400, detail="Invalid difficulty level")
  difficulty = Difficulty(generate_saq_request.difficulty)
  saq_groups = question_generator_model.generate_saq(generate_saq_request.topic, difficulty)
  if saq_groups is None:
    raise HTTPException(status_code=500, detail="Failed to generate SAQs")
  question_set_id = str(uuid4())
  try:
    body = {"question_set_id": question_set_id, "topic": generate_saq_request.topic, "saqs": saq_groups}
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_saq/", json=body)
    if not response.ok:
      print("Error in saving SAQs")
      raise HTTPException(status_code=500, detail="Error in saving SAQs")
    else:
      try:
        # Check if image prompt already exists
        response = requests.get(f"http://{datamodule_name}:{datamodule_port}/retrieve_image_prompt/{generate_saq_request.topic}/")
        if response.ok:
          if response.json()["image_prompt"] != "":
            return
        # Generate image prompt
        image_prompt = image_prompt_generator.generate_image_prompt(generate_saq_request.topic)
        if image_prompt is None:
          print("Error in generating image prompt")
          raise HTTPException(status_code=500, detail="Error in generating image prompt")
        else:
          try:
            body = {"topic": generate_saq_request.topic, "image_prompt": image_prompt}
            response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_image_prompt/", json=body)
            if not response.ok:
              print("Error in saving image prompt")
              raise HTTPException(status_code=500, detail="Error in saving image prompt")
          except Exception as e:
            print("Error in saving image prompt")
            print(e)
            raise HTTPException(status_code=500, detail="Error in saving image prompt")
      except Exception as e:
        print("Error in generating image prompt")
        print(e)
        raise HTTPException(status_code=500, detail="Error in generating image prompt")
  except Exception as e:
    print("Error in saving SAQs")
    print(e)
    raise HTTPException(status_code=500, detail="Error in saving SAQs")
  return

@app.post("/evaluate_mcqs/")
def evaluate_mcqs(evaluate_mcqs_request: EvaluateMCQsRequest):
  responses = []
  for evaluate_mcq_request in evaluate_mcqs_request.evaluate_mcqs_request:
    response = {}
    response["mcq"] = evaluate_mcq_request.mcq
    response["chosen_option"] = evaluate_mcq_request.chosen_option
    response["feedback"] = answer_evaluator_model.evaluate_mcq(evaluate_mcq_request.mcq, evaluate_mcq_request.chosen_option, evaluate_mcq_request.additional_info)
    responses.append(response)
  try:
    body = {
      "mcq_feedbacks": [
        {
          "question_set_id": evaluate_mcqs_request.question_set_id,
          "question_id": response["mcq"].id,
          "chosen_option": response["chosen_option"],
          "feedback": response["feedback"]
        } for response in responses
      ]
    }
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_mcq_feedbacks/", json=body)
    if not response.ok:
      print("Error in saving MCQ feedbacks")
      raise HTTPException(status_code=500, detail="Error in saving MCQ feedbacks")
  except Exception as e:
    print("Error in saving MCQ feedbacks")
    print(e)
    raise HTTPException(status_code=500, detail="Error in saving MCQ feedbacks")
  return EvaluateMCQsResponses(responses=responses)

@app.post("/evaluate_saqs/")
def evaluate_saqs(evaluate_saqs_request: EvaluateSAQsRequest):
  responses = []
  for evaluate_saq_request in evaluate_saqs_request.evaluate_saqs_request:
    response = {}
    response["saq"] = evaluate_saq_request.saq
    response["input_answer"] = evaluate_saq_request.input_answer
    response["feedback"] = answer_evaluator_model.evaluate_saq(evaluate_saq_request.saq, evaluate_saq_request.input_answer, evaluate_saq_request.additional_info)
    responses.append(response)  
  try:
    body = {
      "saq_feedbacks": [
        {
          "question_set_id": evaluate_saqs_request.question_set_id,
          "question_id": response["saq"].id,
          "input_answer": response["input_answer"],
          "feedback": response["feedback"]
        } for response in responses
      ]
    }
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_saq_feedbacks/", json=body)
    if not response.ok:
      print("Error in saving SAQ feedbacks")
      raise HTTPException(status_code=500, detail="Error in saving SAQ feedbacks")
  except Exception as e:
    print("Error in saving SAQ feedbacks")
    print(e)
    raise HTTPException(status_code=500, detail="Error in saving SAQ feedbacks")
  return EvaluateSAQsResponses(responses=responses)

@app.post("/summarize/")
def summarize(summarize_request: SummarizeRequest):
  response = summarizer.summarize(summarize_request.topic, summarize_request.examples, summarize_request.context)
  if response is None:
    raise HTTPException(status_code=500, detail="Failed to summarize")
  try:
    body = {"topic": summarize_request.topic, "summary": response}
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_summary/", json=body)
    if not response.ok:
      print("Error in saving summary")
      raise HTTPException(status_code=500, detail="Error in saving summary")
    else:
      try:
        # Check if image prompt already exists
        response = requests.get(f"http://{datamodule_name}:{datamodule_port}/retrieve_image_prompt/{summarize_request.topic}/")
        if response.ok:
          if response.json()["image_prompt"] != "":
            return
        # Generate image prompt
        image_prompt = image_prompt_generator.generate_image_prompt(summarize_request.topic)
        if image_prompt is None:
          print("Error in generating image prompt")
          raise HTTPException(status_code=500, detail="Error in generating image prompt")
        else:
          try:
            body = {"topic": summarize_request.topic, "image_prompt": image_prompt}
            response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_image_prompt/", json=body)
            if not response.ok:
              print("Error in saving image prompt")
              raise HTTPException(status_code=500, detail="Error in saving image prompt")
          except Exception as e:
            print("Error in saving image prompt")
            print(e)
            raise HTTPException(status_code=500, detail="Error in saving image prompt")
      except Exception as e:
        print("Error in generating image prompt")
        print(e)
        raise HTTPException(status_code=500, detail="Error in generating image prompt")
  except Exception as e:
    print("Error in saving summary")
    print(e)
    raise HTTPException(status_code=500, detail="Error in saving summary")
  return

@app.post("/generate_image_prompt/")
def generate_image_prompt(generate_image_prompt_request: GenerateImagePromptRequest):
  # Check if image prompt already exists
  response = requests.get(f"http://{datamodule_name}:{datamodule_port}/retrieve_image_prompt/{generate_image_prompt_request.topic}/")
  if response.ok:
    if response.json()["image_prompt"] != "":
      return
  # Generate image prompt and save
  image_prompt = image_prompt_generator.generate_image_prompt(generate_image_prompt_request.topic)
  if image_prompt is None:
    raise HTTPException(status_code=500, detail="Failed to generate image prompt")
  try:
    body = {"topic": generate_image_prompt_request.topic, "image_prompt": image_prompt}
    response = requests.post(f"http://{datamodule_name}:{datamodule_port}/save_image_prompt/", json=body)
    if not response.ok:
      print("Error in saving image prompt")
      raise HTTPException(status_code=500, detail="Error in saving image prompt")
  except Exception as e:
    print("Error in saving image prompt")
    print(e)
    raise HTTPException(status_code=500, detail="Error in saving image prompt")
  return


if __name__ == '__main__':
  uvicorn.run(app, port=8001, host='0.0.0.0')