import os
import requests
import re
from dotenv import load_dotenv
from LLM import llm
from enum import Enum
from pydantic import BaseModel
from typing import Literal, List
import json


retrieval_name = "retrieval-module"
#retrieval_name = "localhost"
retrieval_port = "8000"


load_dotenv()


class Difficulty(Enum):
  easy = 1
  medium = 2
  hard = 3

class MCQ(BaseModel):
  question: str
  option_a: str
  option_b: str
  option_c: str
  option_d: str
  reason_for_correct_option: str
  correct_option: Literal['a', 'b', 'c', 'd']

class MCQs(BaseModel):
  questions: List[MCQ]

class SAQ(BaseModel):
  question: str
  reason_for_correct_answer: str
  correct_answer: str

class SAQs(BaseModel):
  questions: List[SAQ]


class QuestionGenerator:
  def __init__(self, vectorstore_url: str, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  # With lm-format-enforcer
  # MCQ
  def generate_mcq(self, topic: str, difficulty: Difficulty):
    num_retries = 3
    num_retries = 3
    try:
      difficulty_str = difficulty.name
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic})
      res_json = res.json()
      retrieved_docs = res_json["docs"]
      context = ""
      if len(retrieved_docs) > 0:
        for doc in retrieved_docs:
          context += doc + "\n\n-----------------------------------\n\n"
      else:
        context += "None"
      filenames = res_json["filenames"]
      generatemcq_system_prompt = f"""Create assignment questions in multiple choice question (MCQ) format with 4 options for each question. \
Create only questions that are clear, concise, and relevant to the topic using information from the content. \
Ensure that the correct option is accurate and well-supported by the content and the wrong options are plausible but incorrect. \
Think carefully about the reasoning behind each option and provide a clear and concise reason for the correct option. \
Do not duplicate questions. 
Strictly return the questions with this json schema only: {json.dumps(MCQs.model_json_schema())}

DO NOT include the options in the question field, the question field should only contain the question text.

Refer to the example below for the correct format:
<example>
{{"questions": [
  {{
    "question": "What is the capital of France?",
    "option_a": "Paris",
    "option_b": "London",
    "option_c": "Berlin",
    "option_d": "Rome",
    "reason_for_correct_option": "Paris is the capital of France.",
    "correct_option": "a"
  }},
  ...
  {{
    "question": "What type of animal is a kangaroo?",
    "option_a": "Bird",
    "option_b": "Reptile",
    "option_c": "Mammal",
    "option_d": "Fish",
    "reason_for_correct_option": "Kangaroos are mammals because they have fur or hair, are warm-blooded, and females produce milk to feed their young.",
    "correct_option": "c"
  }}
  ]
}}
</example>"""
      generatemcq_prompt_template = f"""Refer to the following content:
<content>{context}</content>

Based on the content, create multiple choice questions related to this topic: {topic}, with a difficulty level of {difficulty_str}.
Follow the json schema provided closely for the correct format.
Multiple Choice Questions (MCQs): """
      while num_retries > 0:
        messages = [{"role": "system", "content": generatemcq_system_prompt}, {"role": "user", "content": generatemcq_prompt_template}]
        response = self.llm.chat_generate_enforce_model(messages=messages, output_model=MCQs)
        print("MCQs generated: " + response)
        mcq_groups = self.parse_mcq(response)
        if mcq_groups is not None:
          return mcq_groups
        num_retries -= 1
      return None
    
    except Exception as e:
      print("Error in generating MCQs")
      print(e)
      return None
    
  def parse_mcq(self, mcq_json):
    try:
      mcq_json = json.loads(mcq_json)
      # Retrieve fields from the JSON response
      mcq_groups = []
      for mcq in mcq_json["questions"]:
        mcq_groups.append({
          "question": mcq["question"],
          "option_a": mcq["option_a"],
          "option_b": mcq["option_b"],
          "option_c": mcq["option_c"],
          "option_d": mcq["option_d"],
          "reason": mcq["reason_for_correct_option"],
          "correct_option": mcq["correct_option"]
        })

    except Exception as e:
      print("Error in parsing MCQs")
      print(e)
      return None

    return mcq_groups


  # SAQ
  def generate_saq(self, topic: str, difficulty: Difficulty):
    num_retries = 3
    try:
      difficulty_str = difficulty.name
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic})
      res_json = res.json()
      context = res_json["docs"]
      context = "None" if context == "" else context
      filenames = res_json["filenames"]
      generatesaq_system_prompt = f"""Create assignment questions in short answer question (SAQ) format. \
Create only questions that are clear, concise, and relevant to the topic using information from the content. \
Ensure that the correct answer is accurate and well-supported by the content. \
Think carefully about the key points that should be included in the answer and provide a clear and concise reason for the correct answer. \
Keep the reasons for the correct answers and the correct answers to a maximum of THREE sentences each.** Brevity is key. \
Do not duplicate questions. 
Strictly return the questions with this json schema only: {json.dumps(SAQs.model_json_schema())}

Refer to the example below for the correct format. Note the length of the answers and reasons in the example are all within the sentence limit:
<example>
{{"questions": [
  {{
    "question": "What is the highest mountain in the world?",
    "reason_for_correct_answer": "Mount Everest is widely recognized as the Earth's highest mountain above sea level.",
    "correct_answer": "Mount Everest"
  }},
  ...
  {{
    "question": "What is the chemical symbol for water?",
    "reason_for_correct_answer": "Water is a chemical substance with the chemical formula H2O, meaning each molecule consists of two hydrogen atoms and one oxygen atom.",
    "correct_answer": "H2O"
  }}
  ]
}}
</example>"""
      generatesaq_prompt_template = f"""Refer to the following content:
<content>{context}</content>

Based on the content, create short answer questions related to this topic: {topic}, with a difficulty level of {difficulty_str}.
**Ensure that all answers and reasons are concise and do not exceed THREE sentences each.**
Follow the json schema provided closely for the correct format.
Short Answer Questions (SAQ): """
      while num_retries > 0:
        messages = [{"role": "system", "content": generatesaq_system_prompt}, {"role": "user", "content": generatesaq_prompt_template}]
        response = self.llm.chat_generate_enforce_model(messages=messages, output_model=SAQs)
        print("SAQs generated: " + response)
        qa_pairs = self.parse_saq(response)
        if qa_pairs is not None:
          return qa_pairs
        num_retries -= 1
      return None
    
    except Exception as e:
      print("Error in generating SAQs")
      print(e)
      return None
    
  def parse_saq(self, saq_json):
    try:
      saq_json = json.loads(saq_json)
      # Retrieve fields from the JSON response
      qa_pairs = []
      for saq in saq_json["questions"]:
        qa_pairs.append({
          "question": saq["question"],
          "reason": saq["reason_for_correct_answer"],
          "correct_answer": saq["correct_answer"]
        })

    except Exception as e:
      print("Error in parsing SAQs")
      print(e)
      return None

    return qa_pairs
  


class AnswerEvaluator:
  def __init__(self, vectorstore_url, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  def evaluate_mcq(self, mcq, chosen_option, additional_info=False):
    additional_info_prompt = "Also offer additional information or clarifications in helping to understand the topic."
    try:
      evaluatemcq_system_prompt = f"""You are an expert in the subject, evaluate the answer to a given question. \
Evaluate the chosen option for a multiple choice question. Read the question, correct option and chosen option carefully. \
Then, provide constructive feedback on the chosen option. \
Your constructive feedback should highlight any inaccuracies or areas of understanding which may need improvement. Otherwise, provide positive feedback. \
{additional_info_prompt if additional_info == True else ""} \
Give your answer in full sentences."""
      evaluatemcq_prompt_template = f"""Evaluate the chosen option for the following multiple choice question. Read the question, correct option, reason and chosen option carefully. \

<question>{mcq.question}</question>
<options>
<option_a>{mcq.option_a}</option_a>
<option_b>{mcq.option_b}</option_b>
<option_c>{mcq.option_c}</option_c>
<option_d>{mcq.option_d}</option_d>
</options>
<correct_option>{mcq.correct_option}</correct_option>
<reason>{mcq.reason}</reason>
<chosen_option>{chosen_option}</chosen_option>

Feedback: """
      messages = [{"role": "system", "content": evaluatemcq_system_prompt}, {"role": "user", "content": evaluatemcq_prompt_template}]
      response = self.llm.chat_generate(messages)
      return response
    except Exception as e:
      print("Error in evaluating MCQs")
      print(e)
      return None
    

  def evaluate_saq(self, saq, input_answer, additional_info=False):
    additional_info_prompt = "Also offer additional information or clarifications in helping to understand the topic."
    try:
      evaluatesaq_system_prompt = f"""You are an expert in the subject, evaluate the answer to a given question. \
Evaluate the input answer for a short answer question. Read the question, correct answer and input answer carefully. \
Then, provide constructive feedback on the input answer. \
Your constructive feedback should highlight any inaccuracies or areas of understanding which may need improvement. Otherwise, provide positive feedback. \
{additional_info_prompt if additional_info == True else ""} \
Do not mention the correct answer in your feedback. \
Give your answer in full sentences."""
      evaluatesaq_prompt_template = f"""Evaluate the input answer for the following short answer question. Read the question, correct answer, reason and input answer carefully. \

<question>{saq.question}</question>
<correct_answer>{saq.correct_answer}</correct_answer>
<reason>{saq.reason}</reason>
<input_answer>{input_answer}</input_answer>

Feedback: """
      messages = [{"role": "system", "content": evaluatesaq_system_prompt}, {"role": "user", "content": evaluatesaq_prompt_template}]
      response = self.llm.chat_generate(messages)
      return response

    except Exception as e:
      print("Error in evaluating SAQs")
      print(e)
      return None
    


class Summarizer:
  def __init__(self, vectorstore_url, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  def summarize(self, topic=None, examples=False, context=False):
    try:
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic, "k": 3})
      res_json = res.json()
      context = res_json["docs"]
      context = "None" if context == "" else context
      filenames = res_json["filenames"]
      summarizer_system_prompt = "You are a highly proficient summarizer tasked with analyzing and condensing information into clear, detailed and well-structured summaries. \
Your goal is to extract the most important points from the provided lecture notes, ensuring that the key concepts, examples, and conclusions are conveyed in a concise, easy-to-understand manner. \
Always organize your responses logically, focus on clarity, and maintain brevity while preserving the core meaning of the content. \
Format your summary in a clear and structured manner, ensuring that it captures the essence of the lecture notes effectively."
      summarizer_prompt_template = f"""Please summarize the following lecture notes, focusing on the key areas outlined below:
{f"Focusing on this topic: {topic}, briefly describe the overarching subjects covered." if topic != None else "Main Topics: Briefly describe the overarching subjects covered in the lecture."}
Key Concepts: Highlight the most significant theories, definitions, or ideas discussed, and provide a clear explanation of each.
{"Important Examples: Summarize any examples or case studies that help illustrate these key concepts." if examples == True else ""}
Conclusions or Takeaways: Note any final conclusions or major insights provided by the lecturer.
{"Context: If relevant, indicate how the material relates to other relevant topics or broader concepts in the subject area." if context == True else ""}
Please ensure the summary is concise but captures all the critical information for an effective review.

Notes: {context}

Summary: """
      messages = [{"role": "system", "content": summarizer_system_prompt}, {"role": "user", "content": summarizer_prompt_template}]
      response = self.llm.chat_generate(messages)
      return response
  
    except Exception as e:
      print("Error in summarizing notes")
      print(e)
      return None
    

class ImagePromptGenerator:
  def __init__(self, vectorstore_url, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  def generate_image_prompt(self, topic:str):
    try:
      imageprompt_system_prompt = """You are an expert in the subject, tasked with creating a prompt for an image generation model. \
Your goal is to provide a detailed description of the image you would like the model to generate to illustrate a topic. \
Think step-by-step about the key elements, objects, and context that should be included in the image before providing the prompt. \
Provide only a single clear and concise response in an XML object of this format: <response><think>{step-by-step thought}</think><prompt>{prompt}</prompt></response>."""
      imageprompt_prompt_template = f"""Create the prompt for the image generation model for the topic: {topic}. 
Think step-by-step about the key elements, objects, and context that should be included in the image before providing the prompt: <response>"""
      messages = [{"role": "system", "content": imageprompt_system_prompt}, {"role": "user", "content": imageprompt_prompt_template}]
      response = self.llm.chat_generate(messages)
      # Parse reason
      reason_matches = re.search(r'<think>(.*?)</think>', response, re.DOTALL)
      if reason_matches:
        reason = reason_matches.group(1)
      else:
        reason = "Error with model"

      # Parse prompt
      prompt_matches = re.search(r'<prompt>(.*?)</prompt>', response, re.DOTALL)
      if prompt_matches:
        prompt = prompt_matches.group(1)
        prompt = prompt.replace("\n", " ")
        prompt = prompt.strip().strip("{}")
        return prompt
      else:
        raise ValueError("Prompt not found in the response")
    
    except Exception as e:
      print("Error in generating image prompt")
      print(e)
      return None



question_generator_model = QuestionGenerator(f"http://{retrieval_name}:{retrieval_port}", llm)
answer_evaluator_model = AnswerEvaluator(f"http://{retrieval_name}:{retrieval_port}", llm)
summarizer = Summarizer(f"http://{retrieval_name}:{retrieval_port}", llm)
image_prompt_generator = ImagePromptGenerator(f"http://{retrieval_name}:{retrieval_port}", llm)