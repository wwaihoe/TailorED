import os
import requests
import re
from dotenv import load_dotenv
from LLM import LlamaCPP
from enum import Enum


retrieval_name = "retrieval-module"
#retrieval_name = "localhost"
retrieval_port = "8000"


load_dotenv()


class Difficulty(Enum):
  easy = 1
  medium = 2
  hard = 3


class QuestionGenerator:
  def __init__(self, vectorstore_url: str, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  # MCQ
  def generate_mcq(self, topic: str, difficulty: Difficulty):
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
      generatemcq_system_prompt = f"""You are an assistant who creates assignment questions in MCQ format with 4 options for each question. 
Create questions in this format: <question>{{question}}</question>\n<options>\n<option>{{option_a}}</option>\n<option>{{option_b}}</option>\n<option>{{option_c}}</option>\n<option>{{option_d}}</option>\n</options>\n<correct_option>{{correct option from a, b, c or d (return only the alphabet)}}</correct_option>"""
      generatemcq_prompt_template = f"""Create questions related to this topic: {topic}, with a difficulty level of {difficulty_str}.
Refer to the following content:

<content>{context}</content>

MCQ Questions: """
      messages = [{"role": "system", "content": generatemcq_system_prompt}, {"role": "user", "content": generatemcq_prompt_template}]
      response = self.llm.chat_generate(messages)
      print("MCQs generated: " + response)
      mcq_groups = self.parse_mcq(response)
      return mcq_groups
    
    except Exception as e:
      print("Error in generating MCQs")
      print(e)
      return None
    
    
  def parse_mcq(self, text):
    try:
      # Optimized regex to match the question, options, and answer sections together
      qa_matches = re.findall(r'<question>(.*?)</question>\s*<options>(.*?)</options>\s*<correct_option>(.*?)</correct_option>', text, re.DOTALL)
      # Process matches in one loop
      mcq_groups = []
      for question, options, answer in qa_matches:
        # Process options into a list
        options_list = [opt.strip() for opt in re.findall(r'<option>(.*?)</option>', options)][:4]
        
        # Add the question, options, and answer to the mcq_pairs list
        mcq_groups.append({
          "question": question.strip().strip("{}"),
          "option_a": options_list[0].strip("{}"),
          "option_b": options_list[1].strip("{}"),
          "option_c": options_list[2].strip("{}"),
          "option_d": options_list[3].strip("{}"),
          "correct_option": answer.strip().strip("{}").lower()
        })
    except Exception as e:
      print("Error in parsing MCQs")
      print(e)
      return None

    return mcq_groups


  #SAQ
  def generate_saq(self, topic: str, difficulty: Difficulty):
    try:
      difficulty_str = difficulty.name
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic})
      res_json = res.json()
      context = res_json["docs"]
      context = "None" if context == "" else context
      filenames = res_json["filenames"]
      generatesaq_system_prompt = f"""You are an assistant who creates assignment questions in short answer format. 
Create questions in this format: <question>{{question}}</question>\n<correct_answer>{{correct answer}}</correct_answer>"""
      generatesaq_prompt_template = f"""Create questions related to this topic: {topic}, with a difficulty level of {difficulty_str}.
Refer to the following content:

<content>{context}</content>

SAQ Questions: """
      messages = [{"role": "system", "content": generatesaq_system_prompt}, {"role": "user", "content": generatesaq_prompt_template}]
      response = self.llm.chat_generate(messages)
      qa_pairs = self.parse_saq(response)
      return qa_pairs
    
    except Exception as e:
      print("Error in generating SAQs")
      print(e)
      return None
    

  def parse_saq(self, text):
    try:
      # Optimized regex to match the question and answer sections together
      qa_matches = re.findall(
        r'<question>(.*?)</question>\s*<correct_answer>(.*?)</correct_answer>',
        text,
        re.DOTALL
      )
      # Process matches in one loop
      qa_pairs = []
      for question, answer in qa_matches:
        # Add the question and answer to the qa_pairs list
        qa_pairs.append({
          "question": question.strip().strip("{}"),
          "correct_answer": answer.strip().strip("{}")
        })
    except Exception as e:
      print("Error in parsing SAQs")
      print(e)
      return
    return qa_pairs
  


class AnswerEvaluator:
  def __init__(self, vectorstore_url, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  def evaluate_mcq(self, mcq, chosen_option, additional_info=False):
    try:
      evaluatemcq_system_prompt = "You are an expert in the subject, evaluate the answer to a given question."
      additional_info_prompt = "Also offer additional information or clarifications in helping to understand the topic."
      evaluatemcq_prompt_template = f"""Evaluate the chosen option for a multiple choice question. Read the question, correct option and chosen option carefully. \
Then, provide constructive feedback if the chosen option is incorrect. Your constructive feedback should highlight any inaccuracies or areas of understanding which may need improvement. \
Otherwise, provide positive feedback. \
{additional_info_prompt if additional_info else ""} \
Give your answer in full sentences. 

<question>{mcq.question}</question>
<options>
<option_a>{mcq.option_a}</option_a>
<option_b>{mcq.option_b}</option_b>
<option_c>{mcq.option_c}</option_c>
<option_d>{mcq.option_d}</option_d>
</options>
<correct_option>{mcq.correct_option}</correct_option>
<chosen_option>{chosen_option}</chosen_option>"""
      messages = [{"role": "system", "content": evaluatemcq_system_prompt}, {"role": "user", "content": evaluatemcq_prompt_template}]
      response = self.llm.chat_generate(messages)
      return response
    except Exception as e:
      print("Error in evaluating MCQs")
      print(e)
      return None
    

  def evaluate_saq(self, saq, input_answer, additional_info=False):
    try:
      evaluatesaq_system_prompt = "You are an expert in the subject, evaluate the answer to a given question."
      additional_info_prompt = "Also offer additional information or clarifications in helping to understand the topic."
      evaluatesaq_prompt_template = f"""Evaluate the input_answer for a short answer question. Read the question, correct answer and input answer carefully. \
Then, provide constructive feedback on how well the answer answers the question. \
Your feedback should highlight any correct points made and point out inaccuracies or areas of understanding which may need improvement.{additional_info_prompt if additional_info else ""}:
Give your answer in full sentences. Do not mention the model answer in your feedback.

<question>{saq.question}</question>
<correct_answer>{saq.correct_answer}</correct_answer>
<input_answer>{input_answer}</input_answer>"""
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
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic})
      res_json = res.json()
      context = res_json["docs"]
      context = "None" if context == "" else context
      filenames = res_json["filenames"]
      summarizer_system_prompt = "You are a highly proficient summarizer tasked with analyzing and condensing information into clear, structured summaries. \
Your goal is to extract the most important points from the provided lecture notes, ensuring that the key concepts, examples, and conclusions are conveyed in a concise, easy-to-understand manner. \
Always organize your responses logically, focus on clarity, and maintain brevity while preserving the core meaning of the content. \
Provide the summary in markdown format."
      summarizer_prompt_template = f"""Please summarize the following lecture notes, focusing on the key areas outlined below:

{f"Focusing on this topic: {topic}:" if topic != None else "Main Topics: Briefly describe the overarching subjects covered in the lecture."}
Key Concepts: Highlight the most significant theories, definitions, or ideas discussed, and provide a brief explanation of each.
{"Important Examples: Summarize any examples or case studies that help illustrate these key concepts." if examples else ""}
Conclusions or Takeaways: Note any final conclusions or major insights provided by the lecturer.
{"Context: If relevant, indicate how the material relates to previous lectures or broader concepts in the subject area." if context else ""}
Please ensure the summary is concise but captures all the critical information for an effective review.
Notes: {context}"""
      messages = [{"role": "system", "content": summarizer_system_prompt}, {"role": "user", "content": summarizer_prompt_template}]
      response = self.llm.chat_generate(messages)
      return response
  
    except Exception as e:
      print("Error in summarizing notes")
      print(e)
      return None


# Load LLM with default settings
model_name = os.environ['MODEL_NAME']
llm = LlamaCPP()
#llm = LlamaCPPPython(model_path=f"../models/{model_name}")
#llm = Ollama(model_name=model_name)

question_generator_model = QuestionGenerator(f"http://{retrieval_name}:{retrieval_port}", llm)
answer_evaluator_model = AnswerEvaluator(f"http://{retrieval_name}:{retrieval_port}", llm)
summarizer = Summarizer(f"http://{retrieval_name}:{retrieval_port}", llm)