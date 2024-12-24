import numpy as np
import pymupdf
import bm25s
import psycopg
from pgvector.psycopg import register_vector
from langchain_text_splitters import RecursiveCharacterTextSplitter
from image_models import ImageCaptionModel
from speech_models import SpeechRecognitionModel
from FlagEmbedding import BGEM3FlagModel, FlagReranker

import torch
#Use GPU if available
if torch.cuda.is_available():
    device = 'cuda'
else:
    device = 'cpu'



class HybridSearch:
  def __init__(self, embedding_model, embedding_dim, reranker, image_caption_model, speech_recognition_model, dbname="database", user="postgres", password="admin", corpus_dict=dict()):
    self.embedding_model = embedding_model
    self.embedding_dim = embedding_dim
    self.reranker = reranker
    self.image_caption_model = image_caption_model
    self.speech_recognition_model = speech_recognition_model
    self.dbname = dbname 
    self.user = user
    self.password = password
    self.retriever = bm25s.BM25()
    # Setup postgres
    conn = psycopg.connect(f"dbname={self.dbname} user={self.user} password={self.password}")
    conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
    register_vector(conn)
    conn.commit()
    conn.execute('DROP TABLE IF EXISTS vectordb')
    conn.commit()
    conn.execute(f'CREATE TABLE IF NOT EXISTS vectordb (id serial PRIMARY KEY, embedding vector({self.embedding_dim}), filename text, text text, length integer)')
    conn.commit()
    conn.close()
    self.corpus_dict = corpus_dict # Dictonary of documents with filename as key and texts as value


  def clear_database(self):
    pass
  

  def split_document(self, document: str, chunk_size: int=10000, chunk_overlap: int=2500):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )
    texts = text_splitter.create_documents([document])
    corpus = [text.page_content for text in texts]
    return corpus
    

  def add_documents(self, filename: str, corpus: list):
    # Add documents to the corpus dict
    self.corpus_dict[filename] = corpus

    try:
      # Add documents to BM25 model
      # Tokenize the corpus and only keep the ids (faster and saves memory)
      full_corpus = []
      for texts in self.corpus_dict.values():
        full_corpus += texts
      corpus_tokens = bm25s.tokenize(full_corpus, stopwords="en")
      # Index the corpus
      self.retriever.index(corpus_tokens)
    except Exception as e:
      print("Error in adding documents to BM25 model")
      print(e)

    try:
      # Add documents to the vector database
      conn = psycopg.connect(f"dbname={self.dbname} user={self.user} password={self.password}")
      # Remove existing documents with the same filename
      conn.execute('DELETE FROM vectordb WHERE filename = %s', (filename,))
      # Embed the corpus
      embeddings = embedding_model.encode(corpus)
      register_vector(conn)
      for text, embedding in zip(corpus, embeddings["dense_vecs"]):
        length = len(text)
        conn.execute('INSERT INTO vectordb (embedding, filename, text, length) VALUES (%s, %s, %s, %s)', (np.array(embedding), filename, text, length))
      conn.commit()
      conn.close()
    except:
      print("Error in adding documents to vector database")
      print(e)

    return
  

  def add_text_document(self, file, filename: str, filesize: float):
    try:
      # Read the document 
      doc = pymupdf.open(stream=file)
      doc_text = ""
      for page in doc: # iterate the document pages
          text = page.get_text() # get plain text encoded as UTF-8
          doc_text += text
          doc_text += "\n\n"
    except Exception as e:
      print("Error in reading the document")
      print(e)
    
    # Split the document into smaller texts
    corpus = self.split_document(doc_text)
    self.add_documents(filename, corpus)
    return


  def add_image(self, file, filename: str, filesize: float):
    caption = self.image_caption_model.generate(file)
    corpus = self.split_document(caption)
    self.add_documents(filename, corpus)
    return
        
    
  def add_speech(self, filepath: str, filename: str, filesize: float):
    speech = self.speech_recognition_model.generate(filepath)
    corpus = self.text_splitter.split_text(speech)
    self.add_documents(filename, corpus)
    return
    

  def remove_documents(self, filename: str):
    # Remove documents from BM25 model
    # Remove from corpus
    del self.corpus_dict[filename]
    # Tokenize the corpus and only keep the ids (faster and saves memory)
    full_corpus = []
    for texts in self.corpus_dict.values():
      full_corpus += texts
    corpus_tokens = bm25s.tokenize(full_corpus, stopwords="en")
    # Index the corpus
    self.retriever.index(corpus_tokens)

    # Remove documents from the vector database
    conn = psycopg.connect(f"dbname={self.dbname} user={self.user} password={self.password}")
    conn.execute('DELETE FROM vectordb WHERE filename = %s', (filename,))
    conn.commit()
    conn.close()
    return


  def keyword_search(self, query, k=3):
    # Query the BM25 model
    query_tokens = bm25s.tokenize(query)
    full_corpus = []
    for texts in self.corpus_dict.values():
      full_corpus += texts
    bm25_results, bm25_scores = self.retriever.retrieve(query_tokens, corpus=full_corpus, k=k)
    docs = []
    filenames = set()
    for i in range(bm25_results.shape[1]):
        doc = bm25_results[0, i]
        docs.append(doc)
        for filename, texts in self.corpus_dict.items():
          if doc in texts:
            filenames.add(filename)
            break
    return docs, filenames


  def vector_search(self, query, k=3):
    # Query the vector database
    embedding = self.embedding_model.encode(query)["dense_vecs"]
    conn = psycopg.connect(f"dbname={self.dbname} user={self.user} password={self.password}")
    register_vector(conn)
    vector_results = conn.execute(f'SELECT embedding, text, filename FROM vectordb ORDER BY embedding <-> %s LIMIT {k}', (np.array(embedding),)).fetchall()
    docs = [text for (embedding, text, filename) in vector_results]
    filenames = set([filename for (embedding, text, filename) in vector_results])
    conn.close()
    return docs, filenames


  def rerank(self, query, docs, k=2):
    # Add the query to the list of documents and remove duplicates
    query_doc_pairs = []
    seen_docs = []
    for doc in docs:
      if doc not in seen_docs:
        query_doc_pairs.append([query, doc])
        seen_docs.append(doc)
    # Compute the scores
    scores = self.reranker.compute_score(query_doc_pairs)
    # Sort the documents by score
    reranked_docs = [doc for score, doc in sorted(zip(scores, seen_docs), reverse=True)]
    # Return top-k documents
    return reranked_docs[:k]


  def search(self, query, k=2):
    print("Keyword Search...")
    keyword_docs, keyword_filenames = self.keyword_search(query, k)
    print("Vector Search...")
    vector_docs, vector_filenames = self.vector_search(query, k)
    all_docs = keyword_docs + vector_docs
    all_filenames = keyword_filenames.union(vector_filenames)
    print("Reranking...")
    reranked_docs = self.rerank(query, all_docs, k)
    return reranked_docs, all_filenames

    
  def load_files(self):
    conn = psycopg.connect(f"dbname={self.dbname} user={self.user} password={self.password}")
    results = conn.execute('SELECT filename, SUM(length) FROM vectordb GROUP BY filename').fetchall()
    conn.close()
    filesizes = []
    for filename, filesize in results:
      filesizes.append({"name": filename, "size": filesize})
    return filesizes



#initialize the embedding, reranker, image captioning model, and vector store
embedding_model = BGEM3FlagModel('BAAI/bge-m3', 
                                 use_fp16=True) # Setting use_fp16 to True speeds up computation with a slight performance degradation
reranker = FlagReranker('BAAI/bge-reranker-v2-m3', 
                        use_fp16=True)
image_caption_model = ImageCaptionModel()
speech_recognition_model = SpeechRecognitionModel()
hybrid_search = HybridSearch(embedding_model=embedding_model, embedding_dim=1024, reranker=reranker, image_caption_model=image_caption_model, speech_recognition_model=speech_recognition_model)