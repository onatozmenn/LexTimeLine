"""
LexTimeline - Logic Analyzer Service ("The Contradiction Detective")

Takes a fully extracted TimelineResponse and performs a second LLM pass
that acts as a Senior Prosecutor / Judge, cross-referencing all events to
detect factual errors, witness conflicts, timeline impossibilities, and
critical information gaps.

Uses OpenAI Structured Outputs to guarantee the response conforms exactly
to the LogicAnalysisResult schema — no post-processing regex required.
"""

import json
import logging
import os
from typing import Any

from openai import AsyncAzureOpenAI, OpenAIError
from openai.types.chat import ChatCompletionMessageParam

from models import LogicAnalysisResult, TimelineEvent, TimelineResponse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4.1")

# Use a non-zero temperature here: we WANT the model to "think creatively"
# and consider non-obvious connections between events, rather than just
# pattern-matching the most obvious conflicts.
ANALYSIS_TEMPERATURE = 0.1

MAX_RETRIES = 2
LOGIC_SCHEMA_NAME = "logic_analysis_result"

# ---------------------------------------------------------------------------
# System Prompt — "The Senior Prosecutor"
# ---------------------------------------------------------------------------

LOGIC_SYSTEM_PROMPT = """
Sen, Türk hukuk sisteminde onlarca yıl deneyim kazanmış, son derece titiz ve
analitik bir kıdemli savcı / hâkimsin. Görevin; bir hukuki belgeden çıkarılmış
olaylar zaman çizelgesini alarak tüm olayları çapraz referanslamak ve içlerindeki
mantıksal tutarsızlıkları, çelişkili beyanları, imkânsız zaman dilimlerini ve
kritik bilgi boşluklarını tespit etmektir.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ANALIZ TALİMATLARI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. OLGUSAL HATALAR (FACTUAL_ERROR)
Her olayda geçen sayısal değerleri (para miktarları, süreler, tarihler,
yüzdeler, adet bilgileri) karşılaştır. Olaylar arasında herhangi bir
uyumsuzluk var mı? Örnek: Bir dilekçede talep edilen tazminat miktarı
bilirkişi raporundaki hesaplamayla eşleşiyor mu?

### 2. TANIK ÇATIŞMALARI (WITNESS_CONFLICT)
Türk hukukunda iki temel çelişki türüne özellikle dikkat et:

- **Çelişkili Beyan (Contradictio in Terminis):** Bir tanık veya tarafın
  ifadesi, başka bir tanık/tarafın ifadesiyle ya da belgelenmiş bir olguyla
  doğrudan çelişiyor. En ağır çelişki türüdür.

- **Tevil Yollu İkrar:** Tarafın ya da tanığın temel bir olguyu kabul
  etmekle birlikte anlamını değiştirmeye ya da hafifletmeye çalıştığı
  durum. "Evet ama..." savunmaları bu kategoriye girer. Tek başına karar
  bozucu nitelikte olmayabilir; ancak güvenilirliği zedeler.

HMK m.200 (Senetle İspat Kuralı) ile çelişen tanık beyanlarını özellikle
işaretle.

### 3. ZAMAN ÇİZELGESİ İMKÂNSIZLIKLARI (TIMELINE_IMPOSSIBILITY)
Aşağıdaki mantıksal hataları ara:

a) **Fiziksel İmkânsızlık:** Bir kişinin aynı anda iki farklı yerde
   bulunması (örn. aynı saatte hem Ankara'da hem İstanbul'da). Şehirler
   arası mesafeyi göz önüne al.

b) **Prosedürel Sıra Hatası:** Bir işlemin yasal ön koşulu tamamlanmadan
   gerçekleştirilmesi. Örn: İhtarname süresi dolmadan dava açılması
   (HMK m.317 - arabuluculuk zorunluluğu), temyiz süresi dolmadan
   icra takibi başlatılması.

c) **Nedensellik Kırılması:** B olayının, B'nin öncülü olan A olayından
   ÖNCE gerçekleşmesi (tarih tutarsızlığı).

d) **Yasal Süre İhlali:** Kanunda öngörülen hak düşürücü süreler veya
   zamanaşımı sürelerinin hesaplamada göz ardı edilmesi.

### 4. EKSİK BİLGİ (MISSING_INFO)
Zaman çizelgesinde geçen ancak hiç açıklanmayan ya da davanın seyrini
etkileyebilecek bilgi boşluklarını tespit et. Örnek: Sözleşmede 12 birim
belirtilmiş ancak yargılama sürecinde yalnızca 8'inden söz ediliyor —
kalan 4 birimin akıbeti nedir?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ÇELİŞKİ OLMAYAN DURUMLAR — BUNLARI İŞARETLEME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Tarafların zıt iddiaları (davalı inkar ediyor, davacı iddia ediyor) —
  bu bir çelişki değil, yargılamanın doğal dinamiğidir.
- Önceki kararın temyizde bozulması — bu usulün normal işleyişidir.
- Sözleşme müzakerelerinde yapılan teklifler ve karşı teklifler.
- Mahkemenin olağan iş akışı içindeki süre uzatmaları.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ÖNEMLİ KURALLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. `involved_event_ids` alanına YALNIZCA gerçekten çelişen olayların
   0-tabanlı dizin numaralarını gir. Alakasız olayları ekleme.
2. Emin olmadığın durumlarda düşük `confidence_score` kullan.
3. `recommended_action` alanında avukata somut, pratik bir öneri sun.
4. `legal_basis` alanında ilgili Türk kanun maddesi veya hukuki kavramı belirt.
5. Çelişki bulamazsan `contradictions` listesini boş döndür ve
   `risk_level` değerini "NONE" olarak ayarla.
6. Tüm açıklama metinlerini belgenin diliyle yaz.

## Çıktı Formatı
YANITINI YALNIZCA aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "contradictions": [
    {
      "title": "...",
      "contradiction_type": "FACTUAL_ERROR",
      "description": "...",
      "involved_event_ids": [0, 1],
      "severity": "HIGH",
      "confidence_score": 0.9,
      "legal_basis": "...",
      "recommended_action": "..."
    }
  ],
  "total_contradictions_found": 0,
  "risk_level": "NONE",
  "analysis_notes": "..."
}
""".strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def detect_contradictions(
    timeline: TimelineResponse,
    model: str | None = None,
) -> LogicAnalysisResult:
    """
    Sends the structured timeline events to GPT-4.1 for cross-referential
    logic analysis and returns all detected contradictions.

    The events are serialized as a numbered JSON array so the LLM can
    reference them by their 0-based array index in `involved_event_ids`.

    Args:
        timeline: The validated TimelineResponse from the extraction phase.
        model:    OpenAI model name override. Falls back to OPENAI_MODEL env var.

    Returns:
        A validated LogicAnalysisResult Pydantic model.

    Raises:
        ValueError:   If the OpenAI response is empty or fails Pydantic validation.
        OpenAIError:  If the OpenAI API call itself fails.
    """
    if not timeline.events:
        logger.warning("detect_contradictions called with an empty events list. Returning empty result.")
        return LogicAnalysisResult(
            contradictions=[],
            total_contradictions_found=0,
            risk_level="NONE",
            analysis_notes="Zaman çizelgesinde olay bulunamadığı için çelişki analizi yapılamadı.",
        )

    resolved_model = model or DEFAULT_MODEL
    client = _get_openai_client()

    serialized_events = _serialize_events_for_prompt(timeline.events)
    user_message = _build_user_message(serialized_events, len(timeline.events))

    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": LOGIC_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    logger.info(
        "Starting contradiction analysis on %d events using model '%s'.",
        len(timeline.events),
        resolved_model,
    )

    try:
        response = await client.chat.completions.create(
            model=resolved_model,
            messages=messages,
            temperature=ANALYSIS_TEMPERATURE,
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
                temperature=ANALYSIS_TEMPERATURE,
                response_format={"type": "json_object"},
            )
        else:
            logger.error("Azure OpenAI API call failed in logic analyzer: %s", exc)
            raise

    raw_content = response.choices[0].message.content

    if not raw_content:
        raise ValueError(
            "Logic analyzer received an empty response from OpenAI. "
            "This may be a transient API issue — please retry."
        )

    logger.info(
        "Logic analysis response received. Finish reason: '%s'. "
        "Tokens — prompt: %d, completion: %d.",
        response.choices[0].finish_reason,
        response.usage.prompt_tokens if response.usage else -1,
        response.usage.completion_tokens if response.usage else -1,
    )

    return _parse_and_validate(raw_content, total_events=len(timeline.events))


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_openai_client() -> AsyncAzureOpenAI:
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


def _serialize_events_for_prompt(events: list[TimelineEvent]) -> str:
    """
    Converts a list of TimelineEvent objects into a compact, numbered JSON array
    string that the LLM can parse and reference by 0-based index.

    Only includes fields relevant to contradiction detection (omits significance
    to reduce token count and avoid biasing the model toward already-flagged items).

    Example output (2 events):
        [
          {"id": 0, "date": "2019-03-15", "description": "...", "entities": [...], "category": "..."},
          {"id": 1, "date": "2020-09-01", "description": "...", "entities": [...], "category": "..."}
        ]
    """
    serializable: list[dict[str, Any]] = []
    for idx, event in enumerate(events):
        serializable.append({
            "id": idx,
            "date": event.date,
            "description": event.description,
            "source_page": event.source_page,
            "entities": event.entities,
            "category": event.category,
        })
    return json.dumps(serializable, ensure_ascii=False, indent=2)


def _build_user_message(serialized_events: str, event_count: int) -> str:
    """
    Builds the user-turn message containing the events and explicit analysis request.
    """
    return (
        f"Aşağıda, bir hukuki belgeden çıkarılmış {event_count} adet zaman çizelgesi olayı "
        f"bulunmaktadır. Her olay, dizideki konumuna karşılık gelen bir `id` alanına sahiptir "
        f"(0-tabanlı indeks). `involved_event_ids` alanında bu `id` değerlerini kullan.\n\n"
        f"Tüm olayları dikkatle incele, çapraz referanslama yap ve tespit ettiğin tüm "
        f"çelişkileri, mantıksal hataları ve bilgi boşluklarını raporla.\n\n"
        f"OLAYLAR:\n"
        f"```json\n{serialized_events}\n```"
    )


def _build_logic_json_schema() -> dict:
    """
    Constructs the strict JSON Schema for OpenAI Structured Outputs.
    All objects must have `additionalProperties: false` as required by
    OpenAI's "strict" mode.
    """
    contradiction_type_enum = [
        "FACTUAL_ERROR",
        "WITNESS_CONFLICT",
        "TIMELINE_IMPOSSIBILITY",
        "MISSING_INFO",
    ]
    severity_enum = ["HIGH", "MEDIUM", "LOW"]
    risk_level_enum = ["HIGH", "MEDIUM", "LOW", "NONE"]

    contradiction_schema = {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "title",
            "contradiction_type",
            "description",
            "involved_event_ids",
            "severity",
            "confidence_score",
            "legal_basis",
            "recommended_action",
        ],
        "properties": {
            "title": {
                "type": "string",
                "description": "Short title (max 10 words) summarizing the conflict.",
            },
            "contradiction_type": {
                "type": "string",
                "enum": contradiction_type_enum,
                "description": "Category of the logical inconsistency.",
            },
            "description": {
                "type": "string",
                "description": "Detailed attorney-grade explanation of the contradiction.",
            },
            "involved_event_ids": {
                "type": "array",
                "items": {"type": "integer"},
                "description": "0-based indices of conflicting events from the input array.",
            },
            "severity": {
                "type": "string",
                "enum": severity_enum,
                "description": "Potential case impact: HIGH, MEDIUM, or LOW.",
            },
            "confidence_score": {
                "type": "number",
                "description": "Model's confidence this is a real contradiction (0.0–1.0).",
            },
            "legal_basis": {
                "type": ["string", "null"],
                "description": "Turkish legal concept or statute implicated.",
            },
            "recommended_action": {
                "type": ["string", "null"],
                "description": "Concrete action the attorney should take.",
            },
        },
    }

    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "contradictions",
            "total_contradictions_found",
            "risk_level",
            "analysis_notes",
        ],
        "properties": {
            "contradictions": {
                "type": "array",
                "items": contradiction_schema,
                "description": "All detected contradictions, ordered HIGH → LOW severity.",
            },
            "total_contradictions_found": {
                "type": "integer",
                "description": "Must equal len(contradictions).",
            },
            "risk_level": {
                "type": "string",
                "enum": risk_level_enum,
                "description": "Overall case risk based on aggregate contradiction severity.",
            },
            "analysis_notes": {
                "type": ["string", "null"],
                "description": "Optional meta-observation about overall document reliability.",
            },
        },
    }


def _build_structured_response_format() -> dict[str, Any]:
    """
    Builds OpenAI/Azure `response_format` payload for strict JSON Schema mode.
    """
    return {
        "type": "json_schema",
        "json_schema": {
            "name": LOGIC_SCHEMA_NAME,
            "strict": True,
            "schema": _build_logic_json_schema(),
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


def _parse_and_validate(raw_json: str, total_events: int) -> LogicAnalysisResult:
    """
    Parses the raw JSON from OpenAI and validates it through the Pydantic model.
    Also performs bounds-checking: any event_id >= total_events is silently
    clamped out to prevent index-out-of-range errors in the frontend.
    """
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse logic analyzer JSON: %s\nRaw: %.500s", exc, raw_json)
        raise ValueError(f"Logic analyzer returned malformed JSON: {exc}") from exc

    # Clamp out-of-bounds event IDs before Pydantic sees them.
    for contradiction in data.get("contradictions", []):
        ids = contradiction.get("involved_event_ids", [])
        valid_ids = [i for i in ids if 0 <= i < total_events]
        if len(valid_ids) != len(ids):
            logger.warning(
                "Clamped invalid event IDs %s → %s (total_events=%d)",
                ids, valid_ids, total_events,
            )
        contradiction["involved_event_ids"] = valid_ids if valid_ids else [0]

    try:
        result = LogicAnalysisResult(**data)
    except Exception as exc:
        logger.error("Pydantic validation failed for logic analyzer response: %s", exc)
        raise ValueError(f"Logic analyzer response failed schema validation: {exc}") from exc

    # Sanity-check: ensure count matches list length.
    actual = len(result.contradictions)
    if result.total_contradictions_found != actual:
        logger.warning(
            "total_contradictions_found (%d) ≠ actual count (%d). Correcting.",
            result.total_contradictions_found,
            actual,
        )
        result.total_contradictions_found = actual

    logger.info(
        "Logic analysis complete. %d contradictions detected. Risk level: %s.",
        actual,
        result.risk_level,
    )
    return result


