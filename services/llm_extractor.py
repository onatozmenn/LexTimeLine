"""
LexTimeline - LLM Extractor Service
Sends extracted PDF text to OpenAI and returns a strictly validated
TimelineResponse using OpenAI's Structured Outputs feature (JSON Schema mode).
"""

import json
import logging
import os
from typing import Optional

from openai import AsyncAzureOpenAI, OpenAIError
from openai.types.chat import ChatCompletionMessageParam

from models import TimelineEvent, TimelineResponse  # noqa: E402

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4.1")
DEFAULT_TEMPERATURE = 0.0  # Deterministic output — critical for legal accuracy.
MAX_RETRIES = 2            # OpenAI client-level retries for transient errors.

# ---------------------------------------------------------------------------
# System Prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """
Sen, Türk hukuku konusunda uzman, deneyimli bir hukuki analiz asistanısın.
Görevin, sağlanan hukuki belge metnini dikkatle inceleyerek içindeki tüm
tarihsel olayları kronolojik sıraya koyarak yapılandırılmış bir zaman çizelgesi
oluşturmaktır.

## Temel Kurallar

1.  **Kapsamlı Ol:** Belgede geçen TÜM tarih içeren olayları çıkar.
    Küçük usul işlemlerini (tebligat, süre uzatımı, duruşma ertelenmesi vb.)
    bile atlama. Bir olayı dahil etmemek, bir olayı yanlış sınıflandırmaktan
    daha büyük bir hatadır.

2.  **Kaynak Sayfası:** Her olayı ilgili `[SAYFA X]` etiketine göre doğru
    sayfa numarasıyla etiketle. Emin değilsen en yakın sayfayı kullan.

3.  **Tarih Normalleştirme:**
    - Tam tarih varsa: "YYYY-MM-DD" formatını kullan.
    - Ay-yıl varsa: "YYYY-MM" formatını kullan.
    - Sadece yıl varsa: "YYYY" formatını kullan.
    - Tarih aralığı varsa: "YYYY-MM-DD / YYYY-MM-DD" formatını kullan.
    - Tarih belirsizse: "Tarih Bilinmiyor" yaz.

4.  **Kategoriler (yalnızca şunları kullan):**
    - "Mahkeme İşlemi"    → Duruşma, karar, ara karar, yargılama vb.
    - "Tanık İfadesi"     → Tanık beyanları, ifade tutanakları.
    - "Olay Anı"          → Suçun, kazanın veya uyuşmazlığın yaşandığı an.
    - "Sözleşme / Anlaşma"→ Sözleşme imzaları, protokoller, uzlaşmalar.
    - "Dilekçe / Başvuru" → Dava açılması, itiraz, temyiz başvurusu vb.
    - "Karar / Hüküm"     → Nihai veya ara kararlar, hükümler.
    - "Tebligat / Bildirim"→ Resmi bildirimler, tebligatlar.
    - "İdari İşlem"       → İdari kararlar, idari başvurular.
    - "İcra Takibi"       → İcra işlemleri, haciz, ödeme emirleri.
    - "Diğer"             → Yukarıdakilere uymayan her şey.

5.  **Varlık Çıkarımı (entities):** Adı, unvanı veya kurumu geçen tüm tarafları
    listele. Kişi adlarını "Unvan Ad Soyad" formatında yaz (ör. "Avukat Ahmet Yılmaz").

6.  **Dil:** Tüm açıklama ve özet alanlarını belgenin dilinde yaz.
    Belge Türkçe ise Türkçe, İngilizce ise İngilizce yaz.

7.  **Hukuki Kesinlik:** Belgede açıkça yazmayan şeyleri çıkarma veya yorumlama.
    Emin olmadığın durumlarda "Belirsiz" veya "Kaydedilmemiş" gibi ifadeler kullan.

8.  **Kronoloji:** Olayları `events` listesinde tarih sırasına göre döndür
    (en eskiden en yeniye).

## Belge Özeti
Tüm analizi tamamladıktan sonra `document_summary` alanına 2-3 cümlelik
bir yönetici özeti ekle. Bu özet, davayı hiç görmeyen kıdemli bir avukata
hızlı bir yönelim sağlamalıdır.

## Çıktı Formatı
YANITINI YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "description": "...",
      "source_page": 1,
      "entities": ["..."],
      "category": "Mahkeme İşlemi",
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
        model:         OpenAI model name. Defaults to OPENAI_MODEL env var or "gpt-4o".
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
                "Aşağıdaki hukuki belge metnini analiz et ve tüm tarihli olayları "
                "çıkararak yapılandırılmış zaman çizelgesini oluştur:\n\n"
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
            response_format={
                "type": "json_object",
            },
        )
    except OpenAIError as exc:
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
                                "Mahkeme İşlemi",
                                "Tanık İfadesi",
                                "Olay Anı",
                                "Sözleşme / Anlaşma",
                                "Dilekçe / Başvuru",
                                "Karar / Hüküm",
                                "Tebligat / Bildirim",
                                "İdari İşlem",
                                "İcra Takibi",
                                "Diğer",
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
