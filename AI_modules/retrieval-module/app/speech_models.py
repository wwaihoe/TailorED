import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline


import torch
#Use GPU if available
if torch.cuda.is_available():
    device = 'cuda'
else:
    device = 'cpu'


class SpeechRecognitionModel():
  def __init__(self, model_str: str="openai/whisper-base.en"):
    self.pipe = pipeline(
      "automatic-speech-recognition",
      model=model_str,
      chunk_length_s=30,
      device=device,
    )
  
  def generate(self, filepath: str):
    try:
      prediction = self.pipe(filepath, batch_size=8)["text"]
      print("Generated speech: ", prediction)
    except Exception as e:
      print("Error generating speech")
      print(e)
      return None
    return prediction