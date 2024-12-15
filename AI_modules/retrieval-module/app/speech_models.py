import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline


device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32


class SpeechRecognitionModel():
  def __init__(self, model_str: str="openai/whisper-large-v3"):
    self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_str, torch_dtype=torch_dtype, low_cpu_mem_usage=True, use_safetensors=True
    )
    self.model.to(device)
    self.processor = AutoProcessor.from_pretrained(model_str)
    self.pipe = pipeline(
        "automatic-speech-recognition",
        model=self.model,
        tokenizer=self.processor.tokenizer,
        feature_extractor=self.processor.feature_extractor,
        max_new_tokens=128,
        torch_dtype=torch_dtype,
        device=device,
    )
  
  def generate(self, filepath: str):
    try:
      result = self.pipe(filepath)
    except Exception as e:
      print("Error generating speech")
      print(e)
    return result["text"]