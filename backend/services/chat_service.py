"""
services/chat_service.py — RAG-lite Case Assistant
====================================================

Takes a user's natural-language question + the full AnalysisResult JSON
(already produced by the /analyze/deep pipeline) and calls GPT-4o to
return a grounded Turkish-language answer with [Olay #N] citations.

Design decisions
----------------
* No vector store or embeddings needed — the structured AnalysisResult is
  compact enough to fit comfortably within GPT-4o's 128 k context window.
* Temperature = 0.3   → deterministic, factual answers.
* The system prompt enforces citation format and bans speculation.
"""

from __future__ import annotations

from typing import Any

from openai import AsyncAzureOpenAI
import os

# ── System prompt template ───────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Sen, Türk hukuk sisteminde uzman bir yapay zeka dava asistanısın.
Aşağıdaki DAVA BAĞLAMI'nı (kronolojik olay zaman çizelgesi ve tespit edilmiş
çelişkiler) tek gerçek kaynak olarak kullanarak soruları yanıtla.

== TEMEL KURALLAR ==
1. YALNIZCA sağlanan DAVA BAĞLAMI'ndaki bilgilere dayan.
2. Her olay referansı için [Olay #N] formatını kullan (1'den başlayarak, tam olarak).
3. Tüm yanıtlarını Türkçe ver; HMK / TBK / CMK maddelerine uygunsa atıfta bulun.
4. Spekülasyon, tahmin veya bağlam dışı bilgi verme.
5. Cevapların özlü, net ve hukuki açıdan değerli olsun.

== DAVA BAĞLAMI ==
{context}
"""


# ── Context serializer ───────────────────────────────────────────────────────

def _build_context_str(ctx: dict[str, Any]) -> str:
    """
    Converts the flat AnalysisResult dict into a structured text block so
    the LLM can easily reference events by their 1-based index.
    """
    events = ctx.get("events", [])
    contras = ctx.get("contradictions", [])

    lines: list[str] = [
        f"Risk Seviyesi  : {ctx.get('risk_level', 'NONE')}",
        f"Toplam Olay    : {len(events)}",
        f"Toplam Çelişki : {len(contras)}",
        f"Belge Özeti    : {ctx.get('document_summary', 'Yok')}",
        "",
        "━━━ OLAYLAR ━━━",
    ]

    for i, ev in enumerate(events):
        entities = ", ".join(ev.get("entities", [])) or "Belirtilmemiş"
        lines += [
            f"",
            f"[Olay #{i + 1}]  Tarih: {ev.get('date', '?')}  |  Kategori: {ev.get('category', '?')}",
            f"  Açıklama  : {ev.get('description', '')}",
            f"  Taraflar  : {entities}",
            f"  Hukuki Önem: {ev.get('significance', 'Belirtilmemiş')}",
        ]

    lines += ["", "━━━ ÇELİŞKİLER ━━━"]

    for i, c in enumerate(contras):
        refs = " | ".join(f"Olay #{eid + 1}" for eid in c.get("involved_event_ids", []))
        lines += [
            f"",
            f"[Çelişki #{i + 1}]  Tür: {c.get('type', '?')}  |  Önem: {c.get('severity', '?')}",
            f"  Başlık     : {c.get('title', '')}",
            f"  Açıklama   : {c.get('description', '')}",
            f"  İlgili     : {refs or 'Belirtilmemiş'}",
            f"  Hukuki Dayanak: {c.get('legal_basis', 'Belirtilmemiş')}",
            f"  Tavsiye    : {c.get('recommended_action', 'Belirtilmemiş')}",
        ]

    return "\n".join(lines)


# ── Main service function ────────────────────────────────────────────────────

async def chat_with_case(
    query: str,
    context: dict[str, Any],
    *,
    model: str = "gpt-4o",
    temperature: float = 0.3,
    max_tokens: int = 1500,
) -> str:
    """
    Send a grounded query to GPT-4o with the full AnalysisResult as context.

    Args:
        query:       User's question (any language; response will be Turkish).
        context:     The full AnalysisResult dict from a prior /analyze/deep call.
        model:       OpenAI model identifier.
        temperature: 0.0–1.0; lower = more deterministic (0.3 recommended).
        max_tokens:  Hard cap on response length.

    Returns:
        Assistant's answer as plain text, with [Olay #N] event citations.

    Raises:
        openai.OpenAIError: On API failure (caller should handle & re-raise as HTTP 503).
    """
    client = AsyncAzureOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", ""),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
    )
    context_str = _build_context_str(context)
    system_prompt = _SYSTEM_PROMPT.format(context=context_str)

    completion = await client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": query},
        ],
    )

    return completion.choices[0].message.content or ""
