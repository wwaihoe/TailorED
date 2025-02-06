import os
import requests
import re
from dotenv import load_dotenv
from LLM import LlamaCPPPython


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
    input_messages = [{"role": "system", "content": "You are an assistant who answers questions accurately."},]
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
      conversationqa_prompt_template = f"""Use the following context to answer the human's question. 
Provide only a single clear and concise response in an XML object of this format: <response><reason>{{reason}}</reason><answer>{{answer}}</answer>. 
If the you do not have sufficient knowledge to answer the question, say "Sorry, I do not have sufficient knowledge to answer the question.". 

<context>{context}</context>

<query>{input_query}</query>

<response>"""
      input_messages.append({"role": "user", "content": conversationqa_prompt_template})
      response = self.llm.chat_generate(input_messages)
      reason = re.search(r'<reason>(.*?)</reason>', response, re.DOTALL).group(1)
      answer = re.search(r'<answer>(.*?)</answer>', response, re.DOTALL).group(1)
      output = {"reason": reason, "answer": answer}
    except Exception as e:
      print(e)
      output = {"reason": "Error with model", "answer": "Error with model"}
      filenames = []
    response = {"content": output, "filenames": filenames}
    return response



# Load LLM with default settings
model_name = os.environ['MODEL_NAME']
tokenizer_name = os.environ['TOKENIZER_NAME']
#llm = LlamaCPP()
llm = LlamaCPPPython(model_path=f"/models/{model_name}", tokenizer_name=tokenizer_name)
#llm = Ollama(model_name=model_name)

qa_chain_model = QAChain(f"http://{retrieval_name}:{retrieval_port}", llm)