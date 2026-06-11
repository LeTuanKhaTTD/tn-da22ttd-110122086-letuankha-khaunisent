# TikUniSent

Vietnamese TikTok sentiment analysis system for university channels using a fine-tuned PhoBERT model.

## Features

- Analyze sentiment from a TikTok video URL.
- Analyze sentiment across a TikTok channel.
- Test a single comment with PhoBERT.
- Manual labeling workflow with PhoBERT suggestions.
- Dashboard with KPI cards, charts, comment tables, and history views.

## Tech Stack

- Backend: Python, FastAPI, Uvicorn, Transformers, PyTorch.
- Frontend: React 18, Vite, TailwindCSS, Recharts, Axios.
- Crawler: Apify API.
- Model: `vinai/phobert-base` fine-tuned for `positive`, `negative`, `neutral`.

## Project Structure

```text
backend/    FastAPI API and NLP services
frontend/   React + Vite dashboard
scripts/    Data merge and training preparation utilities
docs/       Architecture and diagrams
data/       Sample data only
models/     Local model placeholder
```

## Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env` and fill in your own values.

Model weights and private datasets are intentionally excluded from this repository.
