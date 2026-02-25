"""
LexTimeline chat endpoint router.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.services.chat_service import chat_with_case

DEFAULT_CHAT_MODEL = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4.1")

router = APIRouter(tags=["Chat"])


class ChatRequest(BaseModel):
    """Body for POST /chat."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User natural-language question.",
        examples=["Bu davayi kisaca ozetle."],
    )
    context: dict[str, Any] = Field(
        ...,
        description="Full AnalysisResult JSON from a prior /analyze/deep call.",
    )
    model: str = Field(
        default=DEFAULT_CHAT_MODEL,
        description="Chat model/deployment name.",
    )


class ChatResponse(BaseModel):
    answer: str = Field(description="Grounded answer with [Olay #N] citations.")
    model_used: str = Field(description="Model/deployment used for this answer.")


@router.post(
    "/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="RAG-lite case assistant",
    description=(
        "Takes a user query and the full AnalysisResult JSON as context. "
        "Returns a grounded Turkish-language answer with [Olay #N] citations."
    ),
    responses={
        200: {"description": "Chat answer generated."},
        422: {"description": "Invalid context payload."},
        503: {"description": "LLM service unavailable."},
    },
)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    if not req.context.get("events"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM unavailable: {exc}",
        ) from exc

    return ChatResponse(answer=answer, model_used=req.model)

