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

class MCQScore(BaseModel):
  topic: str
  num_questions: int
  num_correct: int

class SAQScore(BaseModel):
  topic: str
  max_score: int
  total_score: int


class QuestionGenerator:
  def __init__(self, vectorstore_url: str, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  # With lm-format-enforcer
  # MCQ
  def generate_mcq(self, topic: str, difficulty: Difficulty):
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
      generatemcq_system_prompt = f"""Create a few assignment questions in multiple choice question (MCQ) format with 4 options for each question. \
Create only questions that are clear, concise, and relevant to the topic using information from the content. \
Ensure that the correct option is accurate and well-supported by the content and the wrong options are plausible but incorrect. \
Provide a clear and concise reason for the correct option. \
Keep the reasons for the correct option to a maximum of THREE sentences each.** Brevity is key. \
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

Based on the content, create a few multiple choice questions related to this topic: {topic}, with a difficulty level of {difficulty_str}.
**STRICTLY ensure that all reasons are concise and do not exceed THREE sentences each no matter what.**
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
      retrieved_docs = res_json["docs"]
      context = ""
      if len(retrieved_docs) > 0:
        for doc in retrieved_docs:
          context += doc + "\n\n-----------------------------------\n\n"
      else:
        context += "None"
      filenames = res_json["filenames"]
      generatesaq_system_prompt = f"""Create a few assignment questions in short answer question (SAQ) format. \
Create only single short answer questions that are clear, concise, and relevant to the topic using information from the content. \
Ensure that the correct answer answers the question fully and is accurate and well-supported by the content. \
Provide a short, clear and concise reason for the correct answer. \
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

Based on the content, create a few short answer questions related to this topic: {topic}, with a difficulty level of {difficulty_str}.
**STRICTLY ensure that all answers and reasons for the correct answers are short and concise and do not exceed THREE sentences each no matter what.**
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
    num_retries = 3
    additional_info_prompt = "Also offer additional information or clarifications in helping to understand the topic."
    try:
      evaluatemcq_system_prompt = f"""You are an expert in the subject, evaluate the answer to a given question. \
Evaluate the chosen option for a multiple choice question. Read the question, correct option and chosen option carefully. \
Then, provide constructive feedback on the chosen option. \
Your constructive feedback should highlight any inaccuracies or areas of understanding which may need improvement. Otherwise, provide positive feedback. \
{additional_info_prompt if additional_info == True else ""} \
Give your answer in full sentences. \
Think step-by-step before providing feedback. \
Provide only a single clear and concise response in an XML object of this format: <response><think>{{step-by-step thought}}</think><feedback>{{feedback}}</feedback></response>."""
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

Feedback: <response>"""
      while num_retries > 0:
        messages = [{"role": "system", "content": evaluatemcq_system_prompt}, {"role": "user", "content": evaluatemcq_prompt_template}]
        feedback_response = self.llm.chat_generate(messages)
        feedback_match = re.search(r'<feedback>(.*?)</feedback>', feedback_response, re.DOTALL)
        if feedback_match is not None:
          feedback = feedback_match.group(1)
          return feedback
        num_retries -= 1
      return None
    
    except Exception as e:
      print("Error in evaluating MCQs")
      print(e)
      return None
    

  def evaluate_saq(self, saq, input_answer, additional_info=False):
    num_retries = 3
    additional_info_prompt = "Also offer additional information or clarifications in helping to understand the topic."
    try:
      # Generate feedback
      evaluatesaq_system_prompt = f"""You are an expert in the subject, evaluate the input answer to a given question. \
Evaluate the input answer for a short answer question. Read the question, correct answer and input answer carefully. \
Then, provide constructive feedback on the input answer. \
Your constructive feedback should highlight inaccuracies or areas of understanding which may need improvement if they exist. Otherwise, if the input answer is correct, provide positive feedback. \
{additional_info_prompt if additional_info == True else ""} \
Do not mention the exact correct answer in your feedback. \
Give your answer in full sentences. \
Think step-by-step before providing feedback. \
Provide only a single clear and concise response in an XML object of this format: <response><think>{{step-by-step thought}}</think><feedback>{{feedback}}</feedback></response>."""
      evaluatesaq_prompt_template = f"""Evaluate the input answer for the following short answer question with respect to the correct answer. Read the question, correct answer, reason and input answer carefully. \

<question>{saq.question}</question>
<correct_answer>{saq.correct_answer}</correct_answer>
<reason>{saq.reason}</reason>
<input_answer>{input_answer}</input_answer>

Think step-by-step before providing feedback for the input answer: <response>"""
      feedback = None
      while num_retries > 0:
        messages = [{"role": "system", "content": evaluatesaq_system_prompt}, {"role": "user", "content": evaluatesaq_prompt_template}]
        feedback_response = self.llm.chat_generate(messages)
        feedback_match = re.search(r'<feedback>(.*?)</feedback>', feedback_response, re.DOTALL)
        if feedback_match is not None:
          feedback = feedback_match.group(1)
          break
        num_retries -= 1
      if feedback is None:
        raise Exception("Feedback not found in the response")
      
      num_retries = 3
      # Generate score
      scoresaq_system_prompt = f"""You are an expert in the subject, evaluate the answer to a given question. \
Score the input answer for a short answer question. Read the question, correct answer, input answer and feedback carefully. \
Think step-by-step before providing a score based on the quality of the input answer with respect to the correct answer on a scale of 1 to 5 with the following criteria: \
1 - Completely Incorrect or Irrelevant, 2 - Largely Incorrect or Severely Incomplete, 3 - Partially Correct or Basic Understanding, 4 - Mostly Correct or Good Understanding, 5 - Completely Correct or Excellent Understanding. \
Provide only a single clear and concise response in an XML object of this format: <response><think>{{step-by-step thought}}</think><score>{{score}}</score></response>."""
      scoresaq_prompt_template = f"""Score the input answer for the following short answer question. Read the question, correct answer, input answer and feedback carefully. \

<question>{saq.question}</question>
<correct_answer>{saq.correct_answer}</correct_answer>
<reason>{saq.reason}</reason>
<input_answer>{input_answer}</input_answer>
<feedback>{feedback}</feedback>

Think step-by-step before providing the score: <response>"""
      score = None
      while num_retries > 0:
        messages = [{"role": "system", "content": scoresaq_system_prompt}, {"role": "user", "content": scoresaq_prompt_template}]
        score_response = self.llm.chat_generate(messages)
        score_match = re.search(r'<score>(.*?)</score>', score_response, re.DOTALL)
        if score_match is not None:
          score = score_match.group(1)
          break
        num_retries -= 1
      if score is None:
        raise Exception("Score not found in the response")
      score = score.replace("\n", "").strip()
      score = int(score)
      response = {"feedback": feedback, "score": score}
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
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic, "k": 4})
      res_json = res.json()
      retrieved_docs = res_json["docs"]
      context = ""
      if len(retrieved_docs) > 0:
        for doc in retrieved_docs:
          context += doc + "\n\n-----------------------------------\n\n"
      else:
        context += "None"
      filenames = res_json["filenames"]
      summarizer_system_prompt = "You are a highly proficient summarizer tasked with analyzing and condensing information into clear, highly detailed and well-structured summaries that cover a specific topic. \
Your goal is to extract key points from the provided lecture notes related to a specific topic, ensuring that the key points and conclusions are conveyed in a concise, easy-to-understand manner. \
Always organize your responses logically, focus on clarity, and ensure that the key ideas of the content are included. \
Format your summary in a clear and structured manner, ensuring that it captures the essence of the topic effectively. \
Please ensure the summary is highly detailed to capture all the critical information related to the specific topic for an effective review. \
Strictly do not include any information that is not found in the lecture notes and ensure that all information included is accurate and relevant with regard to the notes provided."
      summarizer_prompt_template = f"""Please summarize the following lecture notes {f"for this topic only: {topic}, " if topic is not None else ""}and include the following sections:
Main Topics: A brief introduction to the overarching subjects covered in the lecture that relate to the topic.
Key Points: Summarize the most significant information, concepts, theories, definitions, frameworks, or ideas discussed, and provide a clear and highly detailed explanation of each, ensuring that all critical points are covered.
{"Important Examples: Summarize any examples or case studies that help illustrate the key information." if examples == True else ""}
Conclusions or Takeaways: Note any final conclusions or major insights provided by the lecture notes.
{"Additional Context: If relevant, highlight how the material relates to other relevant topics or broader concepts in the subject area." if context == True else ""}
Please ensure that the summary is detailed, accurate, and well-structured, providing a comprehensive overview of the specific topic based on the lecture notes. 

<notes>{context}</notes>

Summary: """
      messages = [{"role": "system", "content": summarizer_system_prompt}, {"role": "user", "content": summarizer_prompt_template}]
      response = self.llm.chat_generate(messages)
      return response
  
    except Exception as e:
      print("Error in summarizing notes")
      print(e)
      return None
    

class StudyPlanGenerator:
  def __init__(self, vectorstore_url, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm

  def generate_study_plan(self, subject: str, topics: List[str], mcq_scores: List[MCQScore], saq_scores: List[SAQScore]):
    try:
      # Condense list of topics
      num_retries = 3
      topic_list = ", ".join(topics)
      condensetopics_system_prompt = "You are a subject matter expert tasked with condensing a list of topics into a more concise list of topics that belong to a specific subject only. \
Your goal is to identify the core topics from the list provided that are part of the specified subject, ensuring that the key topics are accurately represented and directly related to the subject. \
Think step-by-step before providing the condensed list, ensuring that only the topics that belong to the subject are captured effectively. \
Provide only a single clear and concise response in an XML object of this format: <response><think>{{step-by-step thought}}</think><list><topic>{{topic1}}</topic><topic>{{topic2}}</topic>...</list></response>."
      condensetopics_prompt_template = f"""Based on the following list of topics: {topic_list}, condense the topics into a more concise list of key topics that belong to the subject: {subject} only. \
Focus exclusively on {subject} and directly related topics. \
Do not include any topics that are not part of the subject or directly related to the subject. \
Think step-by-step before providing the condensed list: <response>"""
      condensed_topics_match_list = None
      while num_retries > 0:
        messages = [{"role": "system", "content": condensetopics_system_prompt}, {"role": "user", "content": condensetopics_prompt_template}]
        response = self.llm.chat_generate(messages)
        condensed_topics_match = re.search(r'<list>(.*?)</list>', response, re.DOTALL)
        if condensed_topics_match is not None:
          condensed_topics_match_list = condensed_topics_match.group(1)
          break
        num_retries -= 1
      if condensed_topics_match_list is not None:
        condensed_topics = condensed_topics_match_list.split("</topic>")
        condensed_topics = [topic.replace("<topic>", "").strip() for topic in condensed_topics if topic != ""]
      else:
        raise Exception("Condensed topics not found in the response")

      # Extract key topics for context for each topic
      extracted_topics = ""
      for topic in condensed_topics:
        res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  topic, "k": 3})
        res_json = res.json()
        retrieved_docs = res_json["docs"]
        context = ""
        if len(retrieved_docs) > 0:
          for doc in retrieved_docs:
            context += doc + "\n\n-----------------------------------\n\n"
        else:
          context += "None"
        extracttopics_system_prompt = "You are a highly proficient topic extractor tasked with analyzing and extracting key topics from the provided lecture notes. \
Your goal is to identify the most important topics discussed in the content, ensuring that the core topics are accurately captured. \
Format your response in a clear and organized list, ensuring that the key topics are easy to identify and understand."
        extracttopics_prompt_template = f"""Based on the following lecture notes, extract the key topics discussed:

<notes>{context}</notes>

Key Topics: """
        messages = [{"role": "system", "content": extracttopics_system_prompt}, {"role": "user", "content": extracttopics_prompt_template}]
        response = self.llm.chat_generate(messages)
        extracted_topics += response + "\n\n-----------------------------------\n\n"
        
      # Combine extracted topics
      if extracted_topics != "":
        combinetopics_system_prompt = "You are an expert summarizer tasked with combining key topics from multiple sources. \
  Your goal is to create a comprehensive list of key topics that cover all the main subjects and areas discussed in the context. \
  Ensure that the key topics are relevant, accurate, and well-organized, providing a clear overview of the main ideas presented without any repetition. \
  Format your response in a clear and structured manner, ensuring that the key topics are easy to identify and understand."
        combinetopics_prompt_template = f"""Based on the extracted key topics shown in the context, combine the topics into a comprehensive list:

  <context>{extracted_topics}</context>

  Key Topics: """
        messages = [{"role": "system", "content": combinetopics_system_prompt}, {"role": "user", "content": combinetopics_prompt_template}]
        final_topics = self.llm.chat_generate(messages)
      else:
        final_topics = None

      # Filter scores based on condensed topics
      condensed_topics_set = set(condensed_topics)
      filtered_mcq_scores = [score for score in mcq_scores if score['topic'] in condensed_topics_set]
      filtered_saq_scores = [score for score in saq_scores if score['topic'] in condensed_topics_set]

      # Generate study plan
      num_retries = 3
      studyplangenerator_system_prompt = f"""You are an expert educational consultant tasked with creating a highly personalized and actionable study plan for me, a student. \
Your goal is to provide a detailed plan for a specifc subject that addresses the my specific needs as a student, covering areas for improvement while recommending topics for further study. \
First, analyze {"the key topics in my curriculum that are directly related to the specified subject, " if final_topics is not None else ""}the topics I have been working on that are directly related to the specified subject and my assessment scores on practice questions for topics that are directly related to the specified subject. \
Then, think about the my strengths and weaknesses, and tailor the study plan to help me achieve my learning goals. \
Provide a structured plan with clear objectives, topics that I should seek improvement on and topics I can work on for further study, and activities to guide my learning process. \
Include specific recommendations for improving performance in the identified areas of weakness, and building on existing strengths. \
The study plan must include the following sections: 
1. Key Topics: {"The key topics in the curriculum that are directly related to the specified subject and t" if final_topics is not None else "T"}he topics I am working on that are directly related to the specified subject 
2. Strengths and Weaknesses: My strengths and weaknesses for the subject based on my assessment scores on practice questions for topics that are directly related to the specified subject 
3. Detailed plan: 
- Clear Objectives: What I should aim to achieve in each study week. 
- Improvement Areas: Specify the topics where I need to improve my understanding and skills in detail. 
- Further Study Topics: Suggest topics for further study to enhance my knowledge and skills in detail. 
- Recommended Activities: Include specific and actionable learning activities, such as practice exercises, readings, relevant online resources, or examples. 

Do not include any information on topics that are not part of the subject or directly related to the subject, including key topics, strengths, weaknesses, and recommendations. 
Format your response in a clear and organized manner, using headings, bullet points, and numbered lists. 
Think step-by-step before providing the study plan. 
Provide only a single clear and concise response in an XML object of this format: <response><think>{{step-by-step thought}}</think><study_plan>{{study plan}}</study_plan></response>."""
      studyplangenerator_prompt_template = f"""Create a study plan for a this subject: {subject}, for me, a student, based on the following {"key topics in my curriculum that are directly related to the specified subject, " if final_topics is not None else ""}topics that I have been working on that are directly related to the specified subject and my assessment scores on practice questions for topics that are directly related to the specified subject: 

{f'''<key_topics_in_curriculum>{final_topics}</key_topics_in_curriculum> 
''' if final_topics is not None else ""}
<topics_I_am_working_on>{", ".join(condensed_topics)}</topics_I_am_working_on>

<mcq_scores>{", ".join([f"{{Topic: {score['topic']}, Score: {score['num_correct']}/{score['num_questions']}}}" for score in filtered_mcq_scores])}</mcq_scores>

<saq_scores>{", ".join([f"{{Topic: {score['topic']}, Score: {score['total_score']}/{score['max_score']}}}" for score in filtered_saq_scores])}</saq_scores>

Focus exclusively on {subject} and directly related topics. 
Please ensure the study plan is easy to follow, actionable, and directly addresses my needs to improve in {subject}. 
Think step-by-step before providing the study plan: <response>"""
      study_plan = None
      while num_retries > 0:
        messages = [{"role": "system", "content": studyplangenerator_system_prompt}, {"role": "user", "content": studyplangenerator_prompt_template}]
        response = self.llm.chat_generate(messages)
        study_plan_match = re.search(r'<study_plan>(.*?)</study_plan>', response, re.DOTALL)
        if study_plan_match is not None:
          study_plan = study_plan_match.group(1)
          break
        num_retries -= 1
      if study_plan is not None:
        return study_plan
      else:
        raise Exception("Study plan not found in the response")
    
    except Exception as e:
      print("Error in generating study plan")
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
study_plan_generator = StudyPlanGenerator(f"http://{retrieval_name}:{retrieval_port}", llm)
image_prompt_generator = ImagePromptGenerator(f"http://{retrieval_name}:{retrieval_port}", llm)