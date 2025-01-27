from llama_cpp import Llama
import requests


class LlamaCPP():
  def __init__(self, server_url: str="http://llamacpp:8002", **kwargs):
    self.server_url = server_url
    defaults = {
      "n_predict": 4096,
    }
    defaults.update(kwargs)
    self.args = defaults

  def generate(self, prompt: str, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Prompt: ", prompt)
    print("Args: ", llm_args)
    output = requests.post(
      f"{self.server_url}/completion",
      json={
        "prompt": prompt,
        **llm_args
      }
    )
    output = output.json()
    print(f"output: {output}")
    response = output["content"]
    return response

  def chat_generate(self, messages: list, **kwargs):
    llm_args = self.args
    llm_args.update(kwargs)
    print("Messages: ", messages)
    print("Args: ", llm_args)
    output = requests.post(
      f"{self.server_url}/v1/chat/completions",
      json={
        "messages": messages,
        **llm_args
      }
    )
    output = output.json()
    print(f"output: {output}")
    response = output["choices"][0]["message"]["content"]
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