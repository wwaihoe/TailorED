from FlagEmbedding import BGEM3FlagModel, FlagModel, FlagReranker

class EmbeddingModel():
  embedding_dims = 768
  def __init__(self):
    self.embedding_model = FlagModel('BAAI/bge-base-en-v1.5', 
                                     use_fp16=True) # Setting use_fp16 to True speeds up computation with a slight performance degradation
                                    
  def encode(self, query):
    embedding = self.embedding_model.encode(query)
    return embedding


class RerankerModel():
  def __init__(self):
    self.reranker = FlagReranker('BAAI/bge-reranker-base', 
                                 use_fp16=True)
                                 
  def compute_score(self, query_doc_pairs):
    scores = self.reranker.compute_score(query_doc_pairs)
    return scores