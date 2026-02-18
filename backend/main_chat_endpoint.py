"""
main_chat_endpoint.py — additions to main.py
=============================================

Paste the contents of this file into your existing main.py
(after the existing imports and app = FastAPI(...) declaration).

New endpoint: POST /chat
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field

from services.chat_service import chat_with_case


# ── Pydantic models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """
    Body for POST /chat.

    `context` is the verbatim JSON that /analyze/deep returned.
    The frontend passes it back so the server stays stateless between
    requests (no server-side session / DB required for the demo).
    """
    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's natural-language question.",
        examples=["Bu davayı kısaca özetle."],
    )
    context: dict[str, Any] = Field(
        ...,
        description="Full AnalysisResult JSON from a prior /analyze/deep call.",
    )
    model: str = Field(
        default="gpt-4o",
        description="OpenAI model identifier.",
    )


class ChatResponse(BaseModel):
    answer: str = Field(description="Grounded answer with [Olay #N] citations.")
    model_used: str


# ── Route ────────────────────────────────────────────────────────────────────

# NOTE: `app` is the FastAPI instance already defined in main.py

@app.post(
    "/chat",
    response_model=ChatResponse,
    tags=["chat"],
    summary="RAG-lite case assistant",
    description=(
        "Takes a user query and the full AnalysisResult JSON as context. "
        "Returns a grounded Turkish-language answer with [Olay #N] citations."
    ),
)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    """
    Example request
    ---------------
    ```json
    {
        "query": "Tespit edilen çelişkileri ve hukuki önemlerini açıkla.",
        "context": { ...AnalysisResult... },
        "model": "gpt-4o"
    }
    ```

    Example response
    ----------------
    ```json
    {
        "answer": "Analizde 4 çelişki tespit edilmiştir... [Olay #3] ile [Olay #7]...",
        "model_used": "gpt-4o"
    }
    ```
    """
    if not req.context.get("events"):
        raise HTTPException(
            status_code=422,
            detail=(
                "context.events is empty. "
                "Run POST /analyze/deep first and pass the full result as 'context'."
            ),
        )

    try:
        answer = await chat_with_case(
            query=req.query,
            context=req.context,
            model=req.model,
        )
    except Exception as exc:
        # Surface LLM / network errors as 503 so the frontend can show a retry prompt.
        raise HTTPException(
            status_code=503,
            detail=f"LLM unavailable: {exc}",
        ) from exc

    return ChatResponse(answer=answer, model_used=req.model)


# ── CORS update (add /chat to allowed origins if needed) ────────────────────
# Your existing CORSMiddleware already covers all routes — no change needed.
