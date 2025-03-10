from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM 
import torch


device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32


class ImageCaptionModel():
  def __init__(self, model_str: str="microsoft/Florence-2-base-ft"):
    self.model = AutoModelForCausalLM.from_pretrained(model_str, torch_dtype=torch_dtype, trust_remote_code=True).to(device)
    self.processor = AutoProcessor.from_pretrained(model_str, trust_remote_code=True)

  def predict(self, image, task_prompt, text_input=None):
    if text_input is None:
        prompt = task_prompt
    else:
        prompt = task_prompt + text_input
    try:
      inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(device, torch_dtype)
      generated_ids = self.model.generate(
        input_ids=inputs["input_ids"].cuda(),
        pixel_values=inputs["pixel_values"].cuda(),
        max_new_tokens=1024,
        early_stopping=False,
        do_sample=False,
        num_beams=3,
      )
      generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
      parsed_answer = self.processor.post_process_generation(
          generated_text, 
          task=task_prompt, 
          image_size=(image.width, image.height)
      )
      return parsed_answer

    except Exception as e:
      print("Error predicting")
      print(e)
      return None
  
  def generate(self, file):
    image = self.load_image(file)
    # Use OCR
    print("Using OCR")
    ocr_result = self.predict(image, "<OCR>")["<OCR>"]
    print("OCR result: ", ocr_result)
    if ocr_result != "":
      return ocr_result

    # If OCR does not work, generate a detailed caption
    print("Generating detailed caption")
    caption = self.predict(image, "<MORE_DETAILED_CAPTION>")["<MORE_DETAILED_CAPION>"]
    print("Caption: ", caption)
    return caption
  
  def load_image(self, file):
    try:
      img = Image.open(file).convert("RGB")
    except Exception as e:
      print("Error loading the image")
      print(e)
    return img