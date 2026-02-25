"""
LexTimeline - FastAPI Application Entry Point  (v1.1.0)

Run with:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

API Docs:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)

Endpoints:
    POST /analyze        — Phase 1 only: PDF → structured timeline (fast)
    POST /analyze/deep   — Phase 1 + 2: PDF → timeline + contradiction analysis
"""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.main_chat_endpoint import router as chat_router
from models import AnalysisResult, TimelineResponse
from services.llm_extractor import extract_timeline
from services.logic_analyzer import detect_contradictions
from services.pdf_parser import PDFParsingError, build_prompt_text, extract_text_by_page

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("lextimeline.main")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_MIME_TYPES = {"application/pdf"}
APP_VERSION = "1.1.0"

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("LexTimeline v%s starting up…", APP_VERSION)
    yield
    logger.info("LexTimeline shutting down. Goodbye.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="LexTimeline API",
    description=(
        "## LexTimeline — Legal Document Intelligence\n\n"
        "Upload a legal PDF and get back:\n\n"
        "- **`/analyze`** — A structured, chronological timeline of all date-bound legal events.\n"
        "- **`/analyze/deep`** — Everything above **plus** an AI-powered contradiction analysis "
        "that cross-references events to detect factual errors, witness conflicts, timeline "
        "impossibilities, and missing information.\n\n"
        "Designed for Turkish legal proceedings (HMK, TBK, CMK) but works with any jurisdiction."
    ),
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Register chat routes from backend router module.
app.include_router(chat_router)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with exact origin in production.
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs method, path, status code, and elapsed time for every request."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d  (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(PDFParsingError)
async def pdf_parsing_exception_handler(request: Request, exc: PDFParsingError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc), "error_type": "PDFParsingError"},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc), "error_type": "ValidationError"},
    )


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

async def _validate_and_read_pdf(file: UploadFile) -> bytes:
    """
    Validates the uploaded file (MIME type + size) and returns its raw bytes.

    Raises:
        HTTPException 400: Invalid content type or empty file.
        HTTPException 413: File exceeds the 50 MB limit.
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid file type '{file.content_type}'. "
                "Only 'application/pdf' files are accepted."
            ),
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty. Please upload a valid PDF.",
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size ({size_mb:.1f} MB) exceeds the 50 MB limit. "
                "Please split the document into smaller sections."
            ),
        )

    return file_bytes


async def _parse_pdf_to_prompt(file_bytes: bytes, filename: str) -> str:
    """
    Runs the PDF parser and builds the LLM prompt string.
    Logs progress at each step.
    """
    pages = extract_text_by_page(file_bytes)
    logger.info("'%s': %d pages with text extracted.", filename, len(pages))

    prompt_text = build_prompt_text(pages, max_chars=120_000)
    logger.info("'%s': prompt text is %d chars.", filename, len(prompt_text))

    return prompt_text


# ---------------------------------------------------------------------------
# Routes: Health
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    """Serves the frontend if built, otherwise returns health check JSON."""
    index = Path(__file__).parent / "dist" / "index.html"
    if index.exists():
        return FileResponse(index)
    return {
        "service": "LexTimeline API",
        "version": APP_VERSION,
        "status": "online",
        "endpoints": {
            "timeline_only": "POST /analyze",
            "deep_analysis": "POST /analyze/deep",
            "chat": "POST /chat",
            "docs": "/docs",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Kubernetes / load-balancer readiness probe."""
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Route: Phase 1 — Timeline extraction only
# ---------------------------------------------------------------------------

@app.post(
    "/analyze",
    response_model=TimelineResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract chronological timeline from a legal PDF",
    description=(
        "**Phase 1 only.** Uploads a PDF, extracts all text page-by-page with PyMuPDF, "
        "then sends the text to GPT-4.1 to produce a structured, chronological list of "
        "all date-bound legal events.\n\n"
        "For the full experience including contradiction detection, use `POST /analyze/deep`.\n\n"
        "**Performance:** ~10–20s for a 20-page document."
    ),
    tags=["Analysis"],
    responses={
        200: {"description": "Timeline successfully extracted."},
        400: {"description": "Invalid file type or empty file."},
        413: {"description": "File exceeds 50 MB limit."},
        422: {"description": "PDF parsing or LLM validation error."},
        500: {"description": "Internal / OpenAI API error."},
    },
)
async def analyze_document(
    file: UploadFile = File(..., description="A PDF legal document. Max 50 MB."),
) -> TimelineResponse:
    """
    Phase 1 pipeline:
      PDF bytes → PyMuPDF text extraction → GPT-4.1 Structured Output → TimelineResponse
    """
    file_bytes = await _validate_and_read_pdf(file)
    logger.info("'/analyze' received '%s' (%.2f MB).", file.filename, len(file_bytes) / 1e6)

    prompt_text = await _parse_pdf_to_prompt(file_bytes, file.filename or "unknown")

    try:
        timeline = await extract_timeline(document_text=prompt_text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Unexpected LLM error in /analyze: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service error. Please retry or check your OpenAI API key and quota.",
        ) from exc

    logger.info("'/analyze' complete: %d events extracted.", timeline.total_events_found)
    return timeline


# ---------------------------------------------------------------------------
# Route: Phase 1 + 2 — Deep analysis (timeline + contradiction detection)
# ---------------------------------------------------------------------------

@app.post(
    "/analyze/deep",
    response_model=AnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Full deep analysis: timeline extraction + contradiction detection",
    description=(
        "**The full LexTimeline pipeline.** Performs Phase 1 (timeline extraction) "
        "followed by Phase 2 (The Contradiction Detective).\n\n"
        "### Phase 2 — What it detects:\n"
        "- **FACTUAL_ERROR** — Numeric/factual inconsistencies between events "
        "(e.g., mismatched monetary amounts).\n"
        "- **WITNESS_CONFLICT** — Irreconcilable testimony conflicts, including "
        "*Çelişkili Beyan* and *Tevil Yollu İkrar* patterns.\n"
        "- **TIMELINE_IMPOSSIBILITY** — Physical/procedural impossibilities such as "
        "being in two cities at once, or acting before a legal prerequisite is met.\n"
        "- **MISSING_INFO** — Critical information gaps that may affect the case outcome.\n\n"
        "Each contradiction includes a **severity** (HIGH/MEDIUM/LOW), a **confidence score** "
        "(0–1), the relevant **Turkish legal basis**, and a **recommended action** for counsel.\n\n"
        "**Performance:** ~25–45s for a 20-page document (two sequential LLM calls)."
    ),
    tags=["Analysis"],
    responses={
        200: {"description": "Full analysis complete — timeline + contradictions returned."},
        400: {"description": "Invalid file type or empty file."},
        413: {"description": "File exceeds 50 MB limit."},
        422: {"description": "PDF parsing or LLM validation error."},
        500: {"description": "Internal / OpenAI API error."},
    },
)
async def analyze_document_deep(
    file: UploadFile = File(..., description="A PDF legal document. Max 50 MB."),
) -> AnalysisResult:
    """
    Full pipeline (3 sequential steps):

      1. PDF bytes  →  PyMuPDF text extraction  (services/pdf_parser.py)
                              ↓
      2. Raw text   →  GPT-4.1 Structured Outputs  →  TimelineResponse
                       (services/llm_extractor.py)
                              ↓
      3. Timeline   →  GPT-4.1 Logic Analysis  →  LogicAnalysisResult
                       (services/logic_analyzer.py)
                              ↓
         TimelineResponse + LogicAnalysisResult  →  AnalysisResult.from_phases()

    Steps 2 and 3 are sequential by design: the logic analyzer requires
    the numbered event list produced by step 2.
    """
    file_bytes = await _validate_and_read_pdf(file)
    logger.info("'/analyze/deep' received '%s' (%.2f MB).", file.filename, len(file_bytes) / 1e6)

    # ── Step 1: PDF → text ────────────────────────────────────────────────────
    prompt_text = await _parse_pdf_to_prompt(file_bytes, file.filename or "unknown")

    # ── Step 2: text → timeline ───────────────────────────────────────────────
    try:
        logger.info("Step 2/3: Running timeline extraction…")
        timeline = await extract_timeline(document_text=prompt_text)
        logger.info(
            "Step 2/3 complete: %d events extracted.",
            timeline.total_events_found,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("LLM error during timeline extraction in /analyze/deep: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service error during timeline extraction. Please retry.",
        ) from exc

    # ── Step 3: timeline → contradiction analysis ─────────────────────────────
    try:
        logger.info("Step 3/3: Running contradiction analysis on %d events…", len(timeline.events))
        logic_result = await detect_contradictions(timeline=timeline)
        logger.info(
            "Step 3/3 complete: %d contradictions found. Risk level: %s.",
            logic_result.total_contradictions_found,
            logic_result.risk_level,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        # Degraded mode: if contradiction analysis fails, don't fail the entire
        # request. Return the timeline with an empty contradiction result and
        # log the error. The caller receives a valid (but incomplete) response.
        logger.error(
            "Logic analysis failed for '%s'. Returning timeline without contradictions. Error: %s",
            file.filename,
            exc,
            exc_info=True,
        )
        from models import LogicAnalysisResult  # local import to avoid circular issues at module level
        logic_result = LogicAnalysisResult(
            contradictions=[],
            total_contradictions_found=0,
            risk_level="NONE",
            analysis_notes=(
                "Çelişki analizi bir hata nedeniyle tamamlanamadı. "
                "Zaman çizelgesi başarıyla oluşturulmuştur."
            ),
        )

    # ── Merge and return ───────────────────────────────────────────────────────
    result = AnalysisResult.from_phases(timeline=timeline, logic=logic_result)

    logger.info(
        "'/analyze/deep' complete for '%s'. Events: %d | Contradictions: %d | Risk: %s.",
        file.filename,
        result.total_events_found,
        result.total_contradictions_found,
        result.risk_level,
    )

    return result


# ---------------------------------------------------------------------------
# Static files — serve the built frontend (dist/) if it exists
# ---------------------------------------------------------------------------

_dist = Path(__file__).parent / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=_dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Catch-all: return index.html for any non-API path (SPA routing)."""
        index = _dist / "index.html"
        return FileResponse(index)


