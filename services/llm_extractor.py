"""
LexTimeline - LLM Extractor Service
Sends extracted PDF text to OpenAI and returns a strictly validated
TimelineResponse using OpenAI's Structured Outputs feature (JSON Schema mode).
"""

import json
import logging
import os
from typing import Any, Optional

from openai import AsyncAzureOpenAI, OpenAIError
from openai.types.chat import ChatCompletionMessageParam

from models import TimelineResponse  # noqa: E402

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4.1")
DEFAULT_TEMPERATURE = 0.0  # Deterministic output â€” critical for legal accuracy.
MAX_RETRIES = 2            # OpenAI client-level retries for transient errors.
TIMELINE_SCHEMA_NAME = "timeline_response"

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
Sen, TÃ¼rk hukuku konusunda uzman, deneyimli bir hukuki analiz asistanÄ±sÄ±n.
GÃ¶revin, saÄŸlanan hukuki belge metnini dikkatle inceleyerek iÃ§indeki tÃ¼m
tarihsel olaylarÄ± kronolojik sÄ±raya koyarak yapÄ±landÄ±rÄ±lmÄ±ÅŸ bir zaman Ã§izelgesi
oluÅŸturmaktÄ±r.

## Temel Kurallar

1.  **KapsamlÄ± Ol:** Belgede geÃ§en TÃœM tarih iÃ§eren olaylarÄ± Ã§Ä±kar.
    KÃ¼Ã§Ã¼k usul iÅŸlemlerini (tebligat, sÃ¼re uzatÄ±mÄ±, duruÅŸma ertelenmesi vb.)
    bile atlama. Bir olayÄ± dahil etmemek, bir olayÄ± yanlÄ±ÅŸ sÄ±nÄ±flandÄ±rmaktan
    daha bÃ¼yÃ¼k bir hatadÄ±r.

2.  **Kaynak SayfasÄ±:** Her olayÄ± ilgili `[SAYFA X]` etiketine gÃ¶re doÄŸru
    sayfa numarasÄ±yla etiketle. Emin deÄŸilsen en yakÄ±n sayfayÄ± kullan.

3.  **Tarih NormalleÅŸtirme:**
    - Tam tarih varsa: "YYYY-MM-DD" formatÄ±nÄ± kullan.
    - Ay-yÄ±l varsa: "YYYY-MM" formatÄ±nÄ± kullan.
    - Sadece yÄ±l varsa: "YYYY" formatÄ±nÄ± kullan.
    - Tarih aralÄ±ÄŸÄ± varsa: "YYYY-MM-DD / YYYY-MM-DD" formatÄ±nÄ± kullan.
    - Tarih belirsizse: "Tarih Bilinmiyor" yaz.

4.  **Kategoriler (yalnÄ±zca ÅŸunlarÄ± kullan):**
    - "Mahkeme Ä°ÅŸlemi"    â†’ DuruÅŸma, karar, ara karar, yargÄ±lama vb.
    - "TanÄ±k Ä°fadesi"     â†’ TanÄ±k beyanlarÄ±, ifade tutanaklarÄ±.
    - "Olay AnÄ±"          â†’ SuÃ§un, kazanÄ±n veya uyuÅŸmazlÄ±ÄŸÄ±n yaÅŸandÄ±ÄŸÄ± an.
    - "SÃ¶zleÅŸme / AnlaÅŸma"â†’ SÃ¶zleÅŸme imzalarÄ±, protokoller, uzlaÅŸmalar.
    - "DilekÃ§e / BaÅŸvuru" â†’ Dava aÃ§Ä±lmasÄ±, itiraz, temyiz baÅŸvurusu vb.
    - "Karar / HÃ¼kÃ¼m"     â†’ Nihai veya ara kararlar, hÃ¼kÃ¼mler.
    - "Tebligat / Bildirim"â†’ Resmi bildirimler, tebligatlar.
    - "Ä°dari Ä°ÅŸlem"       â†’ Ä°dari kararlar, idari baÅŸvurular.
    - "Ä°cra Takibi"       â†’ Ä°cra iÅŸlemleri, haciz, Ã¶deme emirleri.
    - "DiÄŸer"             â†’ YukarÄ±dakilere uymayan her ÅŸey.

5.  **VarlÄ±k Ã‡Ä±karÄ±mÄ± (entities):** AdÄ±, unvanÄ± veya kurumu geÃ§en tÃ¼m taraflarÄ±
    listele. KiÅŸi adlarÄ±nÄ± "Unvan Ad Soyad" formatÄ±nda yaz (Ã¶r. "Avukat Ahmet YÄ±lmaz").

6.  **Dil:** TÃ¼m aÃ§Ä±klama ve Ã¶zet alanlarÄ±nÄ± belgenin dilinde yaz.
    Belge TÃ¼rkÃ§e ise TÃ¼rkÃ§e, Ä°ngilizce ise Ä°ngilizce yaz.

7.  **Hukuki Kesinlik:** Belgede aÃ§Ä±kÃ§a yazmayan ÅŸeyleri Ã§Ä±karma veya yorumlama.
    Emin olmadÄ±ÄŸÄ±n durumlarda "Belirsiz" veya "KaydedilmemiÅŸ" gibi ifadeler kullan.

8.  **Kronoloji:** OlaylarÄ± `events` listesinde tarih sÄ±rasÄ±na gÃ¶re dÃ¶ndÃ¼r
    (en eskiden en yeniye).

## Belge Ã–zeti
TÃ¼m analizi tamamladÄ±ktan sonra `document_summary` alanÄ±na 2-3 cÃ¼mlelik
bir yÃ¶netici Ã¶zeti ekle. Bu Ã¶zet, davayÄ± hiÃ§ gÃ¶rmeyen kÄ±demli bir avukata
hÄ±zlÄ± bir yÃ¶nelim saÄŸlamalÄ±dÄ±r.

## Ã‡Ä±ktÄ± FormatÄ±
YANITINI YALNIZCA aÅŸaÄŸÄ±daki JSON formatÄ±nda ver, baÅŸka hiÃ§bir metin ekleme:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "description": "...",
      "source_page": 1,
      "entities": ["..."],
      "category": "Mahkeme Ä°ÅŸlemi",
      "significance": "..." 
    }
  ],
  "document_summary": "...",
  "total_events_found": 0,
  "primary_jurisdiction": "..." ,
  "case_number": "..."
}
""".strip()


# ---------------------------------------------------------------------------
# Client factory
# ---------------------------------------------------------------------------

def _get_openai_client() -> AsyncAzureOpenAI:
    """
    Creates and returns an AsyncAzureOpenAI client.
    Reads credentials from AZURE_OPENAI_* environment variables.

    Returns:
        Configured AsyncAzureOpenAI client instance.

    Raises:
        ValueError: If required Azure environment variables are not set.
    """
    api_key  = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    version  = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    if not api_key or not endpoint:
        raise ValueError(
            "AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables "
            "must be set. Please add them to your .env file."
        )
    return AsyncAzureOpenAI(
        api_key=api_key,
        azure_endpoint=endpoint,
        api_version=version,
        max_retries=MAX_RETRIES,
    )


# ---------------------------------------------------------------------------
# Core extraction function
# ---------------------------------------------------------------------------

async def extract_timeline(
    document_text: str,
    model: Optional[str] = None,
    temperature: float = DEFAULT_TEMPERATURE,
) -> TimelineResponse:
    """
    Sends the extracted PDF text to OpenAI and returns a validated TimelineResponse.

    Uses OpenAI's `response_format` with `json_schema` (Structured Outputs) to
    guarantee the response strictly conforms to the `TimelineResponse` Pydantic
    schema. This eliminates the need for fragile post-processing regex hacks.

    Args:
        document_text: The concatenated, page-tagged text from the PDF.
        model:         OpenAI model name. Defaults to OPENAI_MODEL env var or "gpt-4.1".
        temperature:   Sampling temperature. Keep at 0.0 for legal precision.

    Returns:
        A validated `TimelineResponse` Pydantic model instance.

    Raises:
        ValueError:   If the OpenAI response is empty or unparseable.
        OpenAIError:  If the OpenAI API call itself fails (network, auth, quota).
    """
    resolved_model = model or DEFAULT_MODEL
    client = _get_openai_client()

    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                "AÅŸaÄŸÄ±daki hukuki belge metnini analiz et ve tÃ¼m tarihli olaylarÄ± "
                "Ã§Ä±kararak yapÄ±landÄ±rÄ±lmÄ±ÅŸ zaman Ã§izelgesini oluÅŸtur:\n\n"
                "---\n"
                f"{document_text}\n"
                "---"
            ),
        },
    ]

    logger.info(
        "Sending document (%d chars) to OpenAI model '%s'.",
        len(document_text),
        resolved_model,
    )

    try:
        response = await client.chat.completions.create(
            model=resolved_model,
            messages=messages,
            temperature=temperature,
            response_format=_build_structured_response_format(),
        )
    except OpenAIError as exc:
        if _should_fallback_to_json_object(exc):
            logger.warning(
                "Structured output unsupported for this deployment/API version. "
                "Falling back to json_object mode. Error: %s",
                exc,
            )
            response = await client.chat.completions.create(
                model=resolved_model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
        else:
            logger.error("Azure OpenAI API call failed: %s", exc)
            raise

    raw_content = response.choices[0].message.content

    if not raw_content:
        raise ValueError(
            "OpenAI returned an empty response. "
            "The document may be too short or contain no extractable legal events."
        )

    logger.info(
        "Received response from OpenAI. Finish reason: '%s'. "
        "Prompt tokens: %d, Completion tokens: %d.",
        response.choices[0].finish_reason,
        response.usage.prompt_tokens if response.usage else -1,
        response.usage.completion_tokens if response.usage else -1,
    )

    return _parse_and_validate(raw_content)


# ---------------------------------------------------------------------------
# JSON Schema builder
# ---------------------------------------------------------------------------

def _build_json_schema() -> dict:
    """
    Constructs the JSON Schema dict from the TimelineResponse Pydantic model.

    We build this manually (rather than using model.model_json_schema()) so we
    can set `additionalProperties: false` at every level, which is REQUIRED
    for OpenAI Structured Outputs "strict" mode.

    Returns:
        A JSON Schema dict compatible with OpenAI's `response_format` parameter.
    """
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "events",
            "document_summary",
            "total_events_found",
            "primary_jurisdiction",
            "case_number",
        ],
        "properties": {
            "events": {
                "type": "array",
                "description": "Chronologically ordered list of all extracted legal events.",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "date",
                        "description",
                        "source_page",
                        "entities",
                        "category",
                        "significance",
                    ],
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "Event date. Format: YYYY-MM-DD, YYYY-MM, YYYY, or date range.",
                        },
                        "description": {
                            "type": "string",
                            "description": "Concise summary of the legal event.",
                        },
                        "source_page": {
                            "type": "integer",
                            "description": "1-indexed source page number.",
                        },
                        "entities": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "People, organizations, courts involved.",
                        },
                        "category": {
                            "type": "string",
                            "description": "Legal category of the event.",
                            "enum": [
                                "Mahkeme Ä°ÅŸlemi",
                                "TanÄ±k Ä°fadesi",
                                "Olay AnÄ±",
                                "SÃ¶zleÅŸme / AnlaÅŸma",
                                "DilekÃ§e / BaÅŸvuru",
                                "Karar / HÃ¼kÃ¼m",
                                "Tebligat / Bildirim",
                                "Ä°dari Ä°ÅŸlem",
                                "Ä°cra Takibi",
                                "DiÄŸer",
                            ],
                        },
                        "significance": {
                            "type": ["string", "null"],
                            "description": "Optional legal significance note.",
                        },
                    },
                },
            },
            "document_summary": {
                "type": "string",
                "description": "2-3 sentence executive summary for a senior attorney.",
            },
            "total_events_found": {
                "type": "integer",
                "description": "Count of events in the events array.",
            },
            "primary_jurisdiction": {
                "type": ["string", "null"],
                "description": "Primary court or jurisdiction, if identifiable.",
            },
            "case_number": {
                "type": ["string", "null"],
                "description": "Official case/docket number (Esas No.), if present.",
            },
        },
    }


# ---------------------------------------------------------------------------
# Response format helpers
# ---------------------------------------------------------------------------

def _build_structured_response_format() -> dict[str, Any]:
    """
    Builds OpenAI/Azure `response_format` payload for strict JSON Schema mode.
    """
    return {
        "type": "json_schema",
        "json_schema": {
            "name": TIMELINE_SCHEMA_NAME,
            "strict": True,
            "schema": _build_json_schema(),
        },
    }


def _should_fallback_to_json_object(exc: OpenAIError) -> bool:
    """
    Returns True when the API/deployment rejects `json_schema` response_format.
    """
    message = str(exc).lower()
    markers = (
        "json_schema",
        "response_format",
        "unsupported",
        "not supported",
        "invalid parameter",
    )
    return any(marker in message for marker in markers)


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def _parse_and_validate(raw_json: str) -> TimelineResponse:
    """
    Parses and validates the raw JSON string from OpenAI into a TimelineResponse.

    Even with Structured Outputs enabled, we validate through Pydantic to catch
    any edge cases and to enrich type safety throughout the rest of the app.

    Args:
        raw_json: The raw JSON string from the OpenAI API response.

    Returns:
        A validated `TimelineResponse` instance.

    Raises:
        ValueError: If JSON is malformed or Pydantic validation fails.
    """
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse OpenAI JSON response: %s\nRaw: %s", exc, raw_json[:500])
        raise ValueError(f"OpenAI returned malformed JSON: {exc}") from exc

    try:
        timeline = TimelineResponse(**data)
    except Exception as exc:  # noqa: BLE001
        logger.error("Pydantic validation failed for OpenAI response: %s", exc)
        raise ValueError(f"OpenAI response failed schema validation: {exc}") from exc

    # Sanity-check: ensure total_events_found matches the actual list length.
    actual_count = len(timeline.events)
    if timeline.total_events_found != actual_count:
        logger.warning(
            "total_events_found (%d) does not match actual event count (%d). Correcting.",
            timeline.total_events_found,
            actual_count,
        )
        timeline.total_events_found = actual_count

    logger.info("Successfully parsed and validated %d timeline events.", actual_count)
    return timeline

