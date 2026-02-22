---
title: LexTimeline
emoji: ⚖️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# ⚖️ LexTimeLine

**LexTimeLine** is an AI-powered legal document analysis tool that transforms Turkish legal PDFs into interactive, structured timelines — and automatically detects contradictions between events. It also includes a RAG-lite chat assistant so you can ask natural-language questions about a case directly from the analyzed document.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **PDF Upload** | Drag-and-drop or click-to-upload any Turkish legal PDF (up to 50 MB) |
| 🗂️ **Timeline Extraction** | AI extracts every date-bound legal event into a clean, ordered timeline |
| ⚡ **Contradiction Detection** | Automatically identifies logical conflicts between timeline events |
| 💬 **Case Chat Assistant** | Ask natural-language questions about the case; get cited, grounded answers |
| 🌙 **Dark / Light Mode** | Fully themeable interface with persisted user preference |
| 🐳 **Docker Ready** | Single-image deployment via the included `Dockerfile` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐      ┌──────────────────────────────────────┐
│      React + TypeScript         │      │          FastAPI (Python)            │
│      Vite  ·  Tailwind CSS      │◄────►│                                      │
│      shadcn/ui  ·  Lucide       │      │  POST /analyze        (Phase 1 only) │
└─────────────────────────────────┘      │  POST /analyze/deep   (Phase 1 + 2)  │
                                         │  POST /chat           (Case Q&A)     │
                                         │                                      │
                                         │  services/                           │
                                         │    pdf_parser.py   ← PyMuPDF         │
                                         │    llm_extractor.py ← Azure OpenAI   │
                                         │    logic_analyzer.py                 │
                                         │    chat_service.py  ← RAG-lite       │
                                         └──────────────────────────────────────┘
```

**Phase 1** — PDF text is extracted page-by-page with PyMuPDF and sent to GPT-4.1 via Azure OpenAI. The model returns a strictly validated JSON timeline (`TimelineResponse`).

**Phase 2** — The timeline is passed to a second LLM call that identifies contradictions between events and returns scored `ContradictionReport` objects.

**Chat** — The full `AnalysisResult` (timeline + contradictions) is injected into GPT-4o's context window. The model answers questions in Turkish with `[Olay #N]` event citations.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.11
- An **Azure OpenAI** resource (or standard OpenAI API key — update the client in `services/llm_extractor.py`)

### 1 — Clone & install

```bash
git clone https://github.com/onatozmenn/LexTimeLine.git
cd LexTimeLine

# Frontend
npm install

# Backend
pip install -r requirements.txt
```

### 2 — Configure environment variables

Create a `.env` file in the project root:

```env
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-api-key>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1        # timeline & contradiction model
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=gpt-4o   # chat assistant model
AZURE_OPENAI_API_VERSION=2024-02-01
```

### 3 — Run (development)

**Terminal 1 — Backend**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.  
API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 🐳 Docker

```bash
# Build
docker build -t lextimeline .

# Run
docker run -p 8000:8000 --env-file .env lextimeline
```

The container serves the pre-built React app as static files from the FastAPI process on port `8000`.

---

## ☁️ Deployment

The repository includes ready-to-use configuration for two platforms:

| Platform | Config file |
|---|---|
| **Fly.io** | `fly.toml` |
| **Render** | `render.yaml` |

Set the environment variables listed above as secrets/env vars in your chosen platform's dashboard.

---

## 📡 API Reference

### `POST /analyze`
Upload a PDF and receive a structured timeline (Phase 1 only — faster).

**Request:** `multipart/form-data` — field `file` (PDF)  
**Response:** `TimelineResponse` JSON

### `POST /analyze/deep`
Upload a PDF and receive a timeline **plus** contradiction analysis (Phase 1 + 2).

**Request:** `multipart/form-data` — field `file` (PDF)  
**Response:** `AnalysisResult` JSON

### `POST /chat`
Ask a natural-language question about a previously analyzed case.

**Request:** JSON `{ "question": "...", "analysis": <AnalysisResult> }`  
**Response:** JSON `{ "answer": "..." }`

---

## 🗂️ Project Structure

```
├── main.py                   # FastAPI app entry point
├── models.py                 # Pydantic data models (TimelineEvent, ContradictionReport, …)
├── requirements.txt          # Python dependencies
├── services/
│   ├── pdf_parser.py         # PDF → plain text (PyMuPDF)
│   ├── llm_extractor.py      # Text → structured timeline (Azure OpenAI)
│   └── logic_analyzer.py     # Timeline → contradictions (Azure OpenAI)
├── backend/
│   ├── main_chat_endpoint.py # /chat route handler
│   └── services/
│       └── chat_service.py   # RAG-lite case Q&A service
├── src/
│   ├── main.tsx
│   └── app/
│       ├── App.tsx
│       └── components/       # React UI components
├── Dockerfile
├── fly.toml
└── render.yaml
```

---

## 🛠️ Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide Icons  
**Backend:** FastAPI, Uvicorn, Pydantic v2, PyMuPDF, OpenAI Python SDK  
**AI:** Azure OpenAI (GPT-4.1 for extraction/analysis, GPT-4o for chat)  
**Infra:** Docker, Fly.io / Render

---

## 📝 License

This project is provided as-is for educational and demonstration purposes.  
See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party library attributions.
