"""
services/chat_service.py - RAG-lite case assistant.
"""

from __future__ import annotations

import os
from typing import Any

from openai import AsyncAzureOpenAI

DEFAULT_CHAT_MODEL = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", "gpt-4.1")
MAX_RETRIES = 2

_SYSTEM_PROMPT = """\
Sen, Turk hukuk sisteminde uzman bir yapay zeka dava asistanisin.
Asagidaki DAVA BAGLAMI'ni (kronolojik olay zaman cizelgesi ve tespit edilmis
celiskiler) tek gercek kaynak olarak kullanarak sorulari yanitla.

== TEMEL KURALLAR ==
1. YALNIZCA saglanan DAVA BAGLAMI'ndaki bilgilere dayan.
2. Her olay referansi icin [Olay #N] formatini kullan (1'den baslayarak, tam olarak).
3. Tum yanitlarini Turkce ver; HMK / TBK / CMK maddelerine uygunsa atifta bulun.
4. Spekulasyon, tahmin veya baglam disi bilgi verme.
5. Cevaplarin ozlu, net ve hukuki acidan degerli olsun.

== DAVA BAGLAMI ==
{context}
"""


def _get_openai_client() -> AsyncAzureOpenAI:
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

    if not api_key or not endpoint:
        raise ValueError(
            "AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT must be set for /chat."
        )

    return AsyncAzureOpenAI(
        api_key=api_key,
        azure_endpoint=endpoint,
        api_version=api_version,
        max_retries=MAX_RETRIES,
    )


def _build_context_str(ctx: dict[str, Any]) -> str:
    """
    Converts flat AnalysisResult into a compact text context for the chat model.
    """
    events = ctx.get("events", [])
    contras = ctx.get("contradictions", [])

    lines: list[str] = [
        f"Risk Seviyesi  : {ctx.get('risk_level', 'NONE')}",
        f"Toplam Olay    : {len(events)}",
        f"Toplam Celiski : {len(contras)}",
        f"Belge Ozeti    : {ctx.get('document_summary', 'Yok')}",
        "",
        "--- OLAYLAR ---",
    ]

    for i, ev in enumerate(events):
        entities = ", ".join(ev.get("entities", [])) or "Belirtilmemis"
        lines += [
            "",
            f"[Olay #{i + 1}]  Tarih: {ev.get('date', '?')}  |  Kategori: {ev.get('category', '?')}",
            f"  Aciklama   : {ev.get('description', '')}",
            f"  Taraflar   : {entities}",
            f"  Hukuki Onem: {ev.get('significance', 'Belirtilmemis')}",
        ]

    lines += ["", "--- CELISKILER ---"]

    for i, c in enumerate(contras):
        refs = " | ".join(f"Olay #{eid + 1}" for eid in c.get("involved_event_ids", []))
        contradiction_type = c.get("contradiction_type") or c.get("type") or "?"
        lines += [
            "",
            f"[Celiski #{i + 1}]  Tur: {contradiction_type}  |  Onem: {c.get('severity', '?')}",
            f"  Baslik     : {c.get('title', '')}",
            f"  Aciklama   : {c.get('description', '')}",
            f"  Ilgili     : {refs or 'Belirtilmemis'}",
            f"  Hukuki Dayanak: {c.get('legal_basis', 'Belirtilmemis')}",
            f"  Tavsiye    : {c.get('recommended_action', 'Belirtilmemis')}",
        ]

    return "\n".join(lines)


async def chat_with_case(
    query: str,
    context: dict[str, Any],
    *,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 1500,
) -> str:
    """
    Send a grounded query to Azure OpenAI with AnalysisResult as context.
    """
    resolved_model = model or DEFAULT_CHAT_MODEL
    client = _get_openai_client()

    context_str = _build_context_str(context)
    system_prompt = _SYSTEM_PROMPT.format(context=context_str)

    completion = await client.chat.completions.create(
        model=resolved_model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    )

    return (completion.choices[0].message.content or "").strip()

