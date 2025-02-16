import numpy as np
import uuid
import pymupdf
import bm25s
import psycopg
from pgvector.psycopg import register_vector
from langchain_text_splitters import RecursiveCharacterTextSplitter
from embedding_models import EmbeddingModel, RerankerModel
from image_models import ImageCaptionModel
from speech_models import SpeechRecognitionModel


class HybridSearch:
  def __init__(self, embedding_dim, host="db", port="5432", dbname="database", user="postgres", password="admin", corpus_dict=dict()):
    self.embedding_dim = embedding_dim
    self.host = host
    self.port = port
    self.dbname = dbname 
    self.user = user
    self.password = password
    self.retriever = bm25s.BM25()
    # Setup postgres
    self.conn = psycopg.connect(f"host={self.host} port={self.port} dbname={self.dbname} user={self.user} password={self.password}")
    self.conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
    register_vector(self.conn)
    self.conn.commit()
    self.conn.execute(f'CREATE TABLE IF NOT EXISTS vectordb (id SERIAL PRIMARY KEY, file_id text, embedding vector({self.embedding_dim}), filename text, text text, length integer)')
    self.conn.commit()
    self.corpus_dict = corpus_dict # Dictonary of documents with id as key and texts as value
    # Add to corpus_dict
    length = self.conn.execute('SELECT COUNT(*) FROM vectordb').fetchone()[0]
    if length > 0:
      results = self.conn.execute('SELECT file_id, text FROM vectordb').fetchall()
      for file_id, text in results:
        if file_id not in self.corpus_dict:
          self.corpus_dict[file_id] = []
        self.corpus_dict[file_id].append(text)
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
        raise


  def clear_database(self):
    pass
  

  def split_document(self, document: str, chunk_size: int=4000, chunk_overlap: int=1500):
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
    # Create a unique id for the file
    file_id = str(uuid.uuid4())

    # Add documents to the corpus dict
    self.corpus_dict[file_id] = corpus

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
      raise

    try:
      # Add documents to the vector database
      # Embed the corpus
      embedding_model = EmbeddingModel()
      embeddings = embedding_model.encode(corpus)
      del embedding_model
      for text, embedding in zip(corpus, embeddings):
        length = len(text)
        self.conn.execute('INSERT INTO vectordb (file_id, embedding, filename, text, length) VALUES (%s, %s, %s, %s, %s)', (file_id, np.array(embedding), filename, text, length))
      self.conn.commit()
    except Exception as e:
      print("Error in adding documents to vector database")
      print(e)
      raise

    return
  

  async def add_text_document(self, file, filename: str, filesize: float):
    doc_text = ""
    try:
      # Read the document 
      file_content = await file.read()
      doc = pymupdf.open(stream=file_content)
      for page in doc: # iterate the document pages
          text = page.get_text() # get plain text encoded as UTF-8
          doc_text += text
          doc_text += "\n\n"
    except Exception as e:
      print("Error in reading the document")
      print(e)
      raise
    
    try:
      # Split the document into smaller texts
      corpus = self.split_document(doc_text)
      self.add_documents(filename, corpus)
      return
    except Exception as e:
      print("Error in adding document to the corpus")
      print(e)
      raise


  def add_image(self, file, filename: str, filesize: float):
    image_caption_model = ImageCaptionModel()
    caption = image_caption_model.generate(file)
    del image_caption_model
    corpus = self.split_document(caption)
    self.add_documents(filename, corpus)
    return
        
    
  def add_speech(self, filepath: str, filename: str, filesize: float):
    speech_recognition_model = SpeechRecognitionModel()
    speech = speech_recognition_model.generate(filepath)
    del speech_recognition_model
    corpus = self.split_document(speech)
    self.add_documents(filename, corpus)
    return
    

  def remove_documents(self, file_id: str):
    # Remove documents from BM25 model
    # Remove from corpus
    del self.corpus_dict[file_id]
    if len(self.corpus_dict) == 0:
      self.retriever = bm25s.BM25()
    else:
      # Tokenize the corpus and only keep the ids (faster and saves memory)
      full_corpus = []
      for texts in self.corpus_dict.values():
        full_corpus += texts
      corpus_tokens = bm25s.tokenize(full_corpus, stopwords="en")
      # Index the corpus
      self.retriever.index(corpus_tokens)

    # Remove documents from the vector database
    self.conn.execute('DELETE FROM vectordb WHERE file_id = %s', (file_id,))
    self.conn.commit()
    return


  def keyword_search(self, query, k=3):
    # Query the BM25 model
    query_tokens = bm25s.tokenize(query)
    full_corpus = []
    for texts in self.corpus_dict.values():
      full_corpus += texts
    # Ensure k is within the valid range
    k = min(k, len(full_corpus))
    if k < 1:
        k = 1
    bm25_results, bm25_scores = self.retriever.retrieve(query_tokens, corpus=full_corpus, k=k)
    docs = []
    filenames = set()
    for i in range(bm25_results.shape[1]):
        doc = bm25_results[0, i]
        docs.append(doc)
        for file_id, texts in self.corpus_dict.items():
          if doc in texts:
            # Get the filename
            filename_result = self.conn.execute('SELECT filename FROM vectordb WHERE file_id = %s', (file_id,)).fetchone()
            filename = filename_result[0]
            filenames.add(filename)
            break
    return docs, filenames


  def vector_search(self, query, k=3):
    # Query the vector database
    embedding_model = EmbeddingModel()
    embedding = embedding_model.encode(query)
    del embedding_model
    vector_results = self.conn.execute(f'SELECT embedding, text, filename FROM vectordb ORDER BY embedding <-> %s LIMIT {k}', (np.array(embedding),)).fetchall()
    docs = [text for (embedding, text, filename) in vector_results]
    filenames = set([filename for (embedding, text, filename) in vector_results])
    return docs, filenames


  def rerank(self, query, docs, k=3):
    # Add the query to the list of documents and remove duplicates
    query_doc_pairs = []
    seen_docs = []
    for doc in docs:
      if doc not in seen_docs:
        query_doc_pairs.append([query, doc])
        seen_docs.append(doc)
    # Compute the scores
    reranker = RerankerModel()
    scores = reranker.compute_score(query_doc_pairs)
    del reranker
    # Sort the documents by score
    reranked_docs = [doc for score, doc in sorted(zip(scores, seen_docs), reverse=True)]
    # Return top-k documents
    if len(reranked_docs) < k:
      return reranked_docs
    else:
      return reranked_docs[:k]


  def search(self, query, k=3):
    if len(self.corpus_dict) > 0:
      print("Keyword Search...")
      keyword_docs, keyword_filenames = self.keyword_search(query, k)
      print("Vector Search...")
      vector_docs, vector_filenames = self.vector_search(query, k)
      all_docs = keyword_docs + vector_docs
      all_filenames = keyword_filenames.union(vector_filenames)
      print("Reranking...")
      reranked_docs = self.rerank(query, all_docs, k)
    else:
      reranked_docs = []
      all_filenames = set()
    return reranked_docs, all_filenames

    
  def load_files(self):
    results = self.conn.execute('SELECT file_id, filename, SUM(length) FROM vectordb GROUP BY file_id, filename').fetchall()
    filesizes = []
    for file_id, filename, filesize in results:
      filesizes.append({"id": file_id, "name": filename, "size": filesize})
    return filesizes


hybrid_search = HybridSearch(embedding_dim=EmbeddingModel.embedding_dims)