import os
import requests
import re
from dotenv import load_dotenv
from LLM import llm


retrieval_name = "retrieval-module"
#retrieval_name = "localhost"
retrieval_port = "8000"


class QAChain:
  def __init__(self, vectorstore_url, llm):
    self.vectorstore_url = vectorstore_url
    self.llm = llm
        

  def generate(self, messages):
    # example dialog: {"dialog": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi"}]}
    if len(messages) == 0:
      response = {"response": "No input", "filenames": None}
      return 
    message_list = [message.model_dump() for message in messages]
    print(message_list)
    input_query = message_list[-1]["content"]
    input_messages = [{"role": "system", "content": '''You are an assistant who provides accurate and informative responses to user queries. \
Try to use the context provided to answer the query. \
Ensure that the response is relevant and answers the user query accurately. \
Think step-by-step before providing an answer. \
Provide only a single clear response in an XML object of this format:  <response><think>{{step-by-step thought}}</think><answer>{{answer}}</answer></response>. \
If you do not have sufficient knowledge to answer the query, say "Sorry, I do not have sufficient knowledge to provide a response."'''},]
    input_messages.extend(message_list)
    try:
      retrieval_query = ""
      for message in input_messages:
        retrieval_query += f'{message["role"]}: {message["content"]}\n\n'
      res = requests.post(f"{self.vectorstore_url}/retrieve/", json={"query":  retrieval_query})
      res_json = res.json()
      retrieved_docs = res_json["docs"]
      context = ""
      if len(retrieved_docs) > 0:
        for doc in retrieved_docs:
          context += doc + "\n\n-----------------------------------\n\n"
      else:
        context += "None"
      filenames = res_json["filenames"]
      conversationqa_prompt_template = f"""Use the following context to respond to the user query.
    
<context>{context}</context>

<query>{input_query}</query>

Think step-by-step before providing an answer: <response>"""
      input_messages.append({"role": "user", "content": conversationqa_prompt_template})
      num_retries = 3
      while num_retries > 0:
        answer = None
        reason = None
        response = self.llm.chat_generate(input_messages)
        answer_matches = re.search(r'<answer>(.*?)</answer>', response, re.DOTALL)
        if answer_matches is not None:
          answer = answer_matches.group(1)
          reason_matches = re.search(r'<think>(.*?)</think>', response, re.DOTALL)
          if reason_matches is not None:
            reason = reason_matches.group(1)
            break
        num_retries -= 1

      if reason is None and answer is not None:
        reason = "Error with model"
      elif reason is None and answer is None:
        reason = "Error with model"
        answer = "Sorry, I am unable to generate a response."
      output = {"reason": reason, "answer": answer}

    except Exception as e:
      print(e)
      output = {"reason": "Error with model", "answer": "Error with model"}
      filenames = []
    response = {"content": output, "filenames": filenames}
    return response



qa_chain_model = QAChain(f"http://{retrieval_name}:{retrieval_port}", llm)