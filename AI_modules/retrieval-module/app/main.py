from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from pydantic import BaseModel
from typing import List, Optional
from retrieval_model import hybrid_search
import os


app = FastAPI()

origins = ["*"]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

class FileSize(BaseModel):
  id: str
  name: str
  size: int

class FileList(BaseModel):
  filesizes: List

class RetrievalQuery(BaseModel):
  query: str
  k: Optional[int] = 3

class RetrievalDoc(BaseModel):
  docs: List[str]
  filenames: List[str]


@app.get("/")
def read_root():
  return {"Server": "On"}

@app.get("/load/")
def load_files():
  filesizes = hybrid_search.load_files()
  return FileList(filesizes=filesizes)

@app.post("/upload/")
async def upload_document(file: UploadFile):
  if file.content_type in ["application/pdf", "text/plain"]:
    await hybrid_search.add_text_document(file, file.filename)
    print(f'{"PDF" if file.content_type == "application/pdf" else "Text"} Uploaded: {file.filename}')
  elif file.content_type in ["image/jpeg", "image/png"]:
    hybrid_search.add_image(file.file, file.filename)
    print("Image Uploaded: ", file.filename)
  elif file.content_type == "audio/mpeg":
    os.makedirs("temp", exist_ok=True)
    path = f"temp/{file.filename}"
    with open(path, "wb") as temp_file:
      temp_file.write(file.file.read())
    hybrid_search.add_speech(path, file.filename)
    # Delete the temp_file after use
    temp_file.close()
    os.remove(path)
    print("Speech Uploaded: ", file.filename)
  else:
    raise HTTPException(status_code=404, detail="Only PDF/JPG/PNG/MP3 files are accepted!")
  return 

@app.delete("/remove/{file_id}/")
def remove_document(file_id: str):
  hybrid_search.remove_documents(file_id)
  print("Removed: ", file_id)
  return

@app.post("/retrieve/")
def retrieve_documents(retrieval_query: RetrievalQuery) -> RetrievalDoc:
  reranked_docs, all_filenames = hybrid_search.search(retrieval_query.query, retrieval_query.k)
  return RetrievalDoc(docs=reranked_docs, filenames=list(all_filenames))


if __name__ == '__main__':
  uvicorn.run(app, port=8000, host='0.0.0.0')