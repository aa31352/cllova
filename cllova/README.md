# Cllova AI OS (Core Scaffold)

## Quick Start

- Node.js >= 20
- Python 3.10+

```bash
# install deps
npm install

# copy env
cp .env.example .env

# dev CLI (tsx)
npx tsx src/cli/index.ts --help
```

## CLI Examples

```bash
# store a memory
npx tsx src/cli/index.ts remember "Cllova remembers facts."

# query memory
npx tsx src/cli/index.ts query "What does Cllova do?"

# run a task handled by example plugin
npx tsx src/cli/index.ts task echo '{"hello":"world"}'
```

## Embeddings

Providers configured via env `EMBEDDING_PROVIDER`:

- `local` (deterministic hash vectors, no external deps)
- `http` (POST to Python FastAPI service at `EMBEDDING_HTTP_URL`)
- `openai` (uses `OPENAI_API_KEY`, model via `OPENAI_EMBEDDING_MODEL`)

### Python Embedding Service

```bash
# optional: create venv if available
python3 -m venv .venv && source .venv/bin/activate || echo "no venv, using system"

pip install -r python/memory_service/requirements.txt
uvicorn python.memory_service.main:app --reload --port 8000
```

Set `EMBEDDING_PROVIDER=http` to use it.

## Build

```bash
npm run build
node dist/cli/index.js --help
```