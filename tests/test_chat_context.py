from backend.services.chat_service import _build_context_str


def test_chat_context_uses_contradiction_type_field() -> None:
    ctx = {
        "risk_level": "HIGH",
        "document_summary": "Ozet",
        "events": [
            {
                "date": "2024-01-01",
                "category": "Mahkeme Islemi",
                "description": "Dava acildi.",
                "entities": ["Davaci"],
                "significance": "Onemli",
            }
        ],
        "contradictions": [
            {
                "title": "Tutar uyusmazligi",
                "contradiction_type": "FACTUAL_ERROR",
                "severity": "HIGH",
                "description": "Iki olay tutarsiz.",
                "involved_event_ids": [0],
                "legal_basis": "HMK m.200",
                "recommended_action": "Ek delil sun.",
            }
        ],
    }

    text = _build_context_str(ctx)

    assert "FACTUAL_ERROR" in text
    assert "[Olay #1]" in text
    assert "[Celiski #1]" in text
