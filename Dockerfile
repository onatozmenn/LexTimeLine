# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Python backend + built frontend ─────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY main.py models.py ./
COPY services/ ./services/
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 7860

CMD uvicorn main:app --host 0.0.0.0 --port 7860
