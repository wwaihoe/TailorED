#from llama_cpp import Llama
import openai
import requests
import os
import dotenv

dotenv.load_dotenv()
llama_server_url = os.getenv("LLAMA_SERVER_URL")
model_name = os.getenv("MODEL_NAME")

class LlamaCPP():
  def __init__(self, server_url: str=llama_server_url, model_name: str=model_name, **kwargs):
    self.server_url = server_url
    self.model_name = model_name
    defaults = {
      "max_tokens": 4096,
    }
    defaults.update(kwargs)
    self.args = defaults
    self.client = openai.OpenAI(
      base_url=f"{self.server_url}/v1",
      api_key = "sk-no-key-required"
    )
    # Warm up the model
    test_response = self.chat_generate([{"role": "assistant", "content": "Hi"}])
    if test_response:
      print(f"Model {self.model_name} loaded successfully")
    else:
      raise Exception(f"Failed to load model: {self.model_name}")

  def generate(self, prompt: str, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Prompt: ", prompt)
    print("Args: ", llm_args)
    #output = requests.post(
    #  f"{self.server_url}/completion",
    #  json={
    #    "prompt": prompt,
    #    **llm_args
    #  }
    #)
    #output = output.json()
    output = self.client.completions.create(
      model=self.model_name,
      prompt=prompt,
      **llm_args
    )
    print(f"output: {output}")
    response = output.choices[0].text
    return response

  def chat_generate(self, messages: list, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Messages: ", messages)
    print("Args: ", llm_args)
    #output = requests.post(
    #  f"{self.server_url}/v1/chat/completions",
    #  json={
    #    "messages": messages,
    #    **llm_args
    #  }
    #)
    #output = output.json()
    output = self.client.chat.completions.create(
      model=self.model_name,
      messages=messages,
      **llm_args
    )
    print(f"output: {output}")
    response = output.choices[0].message.content
    return response


class LlamaCPPPython():
  def __init__(self, model_path: str, **kwargs):
    print(f"Loading model: {model_path}...")
    self.model_path = model_path
    self.llm = Llama(
      model_path=self.model_path,
      n_gpu_layers=-1,
      seed=1234,
      n_ctx=4096,
      flash_attn=True,
    )

    defaults = {
      "max_tokens": 4096,
    }
    defaults.update(kwargs)
    self.args = defaults

        
  def generate(self, prompt: str, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Prompt: ", prompt)
    print("Args: ", llm_args)
    output = self.llm(
      prompt,
      echo=False,
      **llm_args
    )
    print(f"output: {output}")
    response = output["choices"][0]["text"]
    return response


  def chat_generate(self, messages: list, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Messages: ", messages)
    print("Args: ", llm_args)
    output = self.llm.create_chat_completion(
      messages,
      **llm_args
    )
    print(f"output: {output}")
    response = output["choices"][0]["message"]["content"]
    return response


class Ollama():
  def __init__(self, model_name: str, ollama_url: str="http://ollama:11434", **kwargs):
    print(f"Loading model: {model_name}...")
    self.ollama_url = ollama_url
    self.model_name = model_name
    defaults = {
    #  "temperature": 1.0,
    #  "repeat_penalty": 1.025,
    #  "min_p": 0.5,
    #  "top_p": 1.0,
    #  "top_k": 0,
      "num_predict": 5192,
      "num_ctx": 5192,
    }
    defaults.update(kwargs)
    self.args = defaults
    # Preload the model
    response = requests.post(
      f"{self.ollama_url}/api/chat",
      json={
        "model": self.model_name,
      }
    )
    if response.status_code != 200:
      raise Exception(f"Failed to preload model: {response.text}")
    else:
      print(f"Model {self.model_name} loaded successfully")

  def generate(self, prompt: str, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Prompt: ", prompt)
    print("Args: ", llm_args)
    output = requests.post(
      f"{self.ollama_url}/api/chat",
      json={
        "model": self.model_name,
        "prompt": prompt,
        "options": llm_args,
        "stream": False
      }
    )
    output = output.json()
    print(f"output: {output}")
    response = output["response"]
    return response
  
  def chat_generate(self, messages: list, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Messages: ", messages)
    print("Args: ", llm_args)
    output = requests.post(
      f"{self.ollama_url}/api/chat",
      json={
        "model": self.model_name,
        "messages": messages,
        "options": llm_args,
        "stream": False
      }
    )
    output = output.json()
    print(f"output: {output}")
    response = output["message"]["content"]
    return response