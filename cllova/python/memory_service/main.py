from typing import List
from fastapi import FastAPI
from pydantic import BaseModel

try:
    from sentence_transformers import SentenceTransformer
    _model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    _dim = len(_model.encode(['ok'])[0])
except Exception:
    _model = None
    _dim = 384

app = FastAPI(title="Cllova Embedding Service")

class EmbedRequest(BaseModel):
    inputs: List[str]

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    provider: str

@app.get('/health')
async def health():
    return {"status": "ok", "model_loaded": _model is not None, "dimension": _dim}

@app.post('/embed', response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    if _model is None:
        # Fallback deterministic vectors
        import hashlib
        vecs: List[List[float]] = []
        for t in req.inputs:
            h = hashlib.sha256(t.encode('utf-8')).digest()
            v = [(h[i % len(h)] / 255.0) for i in range(_dim)]
            # normalize
            import math
            n = math.sqrt(sum(x*x for x in v)) or 1.0
            v = [x / n for x in v]
            vecs.append(v)
        return {"embeddings": vecs, "dimension": _dim, "provider": "fallback"}

    embs = _model.encode(req.inputs, normalize_embeddings=True)
    return {"embeddings": [e.tolist() for e in embs], "dimension": len(embs[0]), "provider": "sentence-transformers"}