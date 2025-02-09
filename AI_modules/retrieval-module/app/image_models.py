from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM 

import torch
#Use GPU if available
if torch.cuda.is_available():
    device = 'cuda'
else:
    device = 'cpu'


class ImageCaptionModel():
  def __init__(self, model_str: str="microsoft/Florence-2-base-ft"):
    self.model = AutoModelForCausalLM.from_pretrained(model_str, trust_remote_code=True)
    self.processor = AutoProcessor.from_pretrained(model_str, trust_remote_code=True)
  
  def generate(self, file):
    image = self.load_image(file)
    prompt = "<MORE_DETAILED_CAPTION>"
    try:
      inputs = self.processor(text=prompt, images=image, return_tensors="pt")
      generated_ids = self.model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=1024,
        do_sample=False,
        num_beams=3
      )
      generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
      parsed_answer = self.processor.post_process_generation(generated_text, task="<MORE_DETAILED_CAPTION>", image_size=(image.width, image.height))
      caption = parsed_answer["<MORE_DETAILED_CAPTION>"]
      print("Generated caption: ", caption)
    except Exception as e:
      print("Error generating caption")
      print(e)
    return caption
  
  def load_image(self, file):
    try:
      img = Image.open(file).convert("RGB")
    except Exception as e:
      print("Error loading the image")
      print(e)
    return img