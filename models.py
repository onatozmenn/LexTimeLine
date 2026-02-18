"""
LexTimeline - Pydantic Data Models
Defines the structured output schemas for the LLM extractor, logic analyzer,
and all API responses.
"""

from enum import Enum
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


# =============================================================================
# Phase 1: Timeline Extraction Models
# =============================================================================

class TimelineEvent(BaseModel):
    """
    Represents a single date-bound legal event extracted from a document.
    """
    date: str = Field(
        ...,
        description=(
            "The date of the event in 'YYYY-MM-DD' format if fully known. "
            "If only month/year is known use 'YYYY-MM'. "
            "If only year is known use 'YYYY'. "
            "If the date is a range, use 'YYYY-MM-DD / YYYY-MM-DD'. "
            "Never leave this field empty; use 'Tarih Bilinmiyor' as a last resort."
        ),
        examples=["2023-04-15", "2022-11", "2021", "2020-01-01 / 2020-06-30"],
    )
    description: str = Field(
        ...,
        description=(
            "A concise but complete summary of the event in the same language as "
            "the source document. Include legally relevant details such as decisions, "
            "rulings, actions taken, and their direct consequences."
        ),
    )
    source_page: int = Field(
        ...,
        ge=1,
        description="The 1-indexed page number of the source document where this event was found.",
    )
    entities: List[str] = Field(
        default_factory=list,
        description=(
            "A list of all people (full names/titles), organizations, courts, or "
            "institutions directly involved in or mentioned by this event."
        ),
        examples=[["Ahmet Yılmaz", "İstanbul 3. Asliye Hukuk Mahkemesi", "Avukat Zeynep Kaya"]],
    )
    category: str = Field(
        ...,
        description=(
            "The legal category that best classifies this event. "
            "Must be one of the following Turkish legal categories: "
            "'Mahkeme İşlemi', 'Tanık İfadesi', 'Olay Anı', 'Sözleşme / Anlaşma', "
            "'Dilekçe / Başvuru', 'Karar / Hüküm', 'Tebligat / Bildirim', "
            "'İdari İşlem', 'İcra Takibi', 'Diğer'."
        ),
        examples=["Mahkeme İşlemi"],
    )
    significance: Optional[str] = Field(
        default=None,
        description=(
            "Optional: A brief note (1 sentence) on why this event is legally "
            "significant or how it affects the overall case trajectory."
        ),
    )


class TimelineResponse(BaseModel):
    """
    The top-level structured response containing all extracted timeline events.
    """
    events: List[TimelineEvent] = Field(
        ...,
        description="A chronologically ordered list of all date-bound events found in the document.",
    )
    document_summary: str = Field(
        ...,
        description=(
            "A 2-3 sentence executive summary of the entire legal document, "
            "written for a senior attorney who needs a quick orientation."
        ),
    )
    total_events_found: int = Field(
        ...,
        ge=0,
        description="The total count of events returned in the 'events' list.",
    )
    primary_jurisdiction: Optional[str] = Field(
        default=None,
        description="The court or jurisdiction that is the primary venue for this case, if identifiable.",
    )
    case_number: Optional[str] = Field(
        default=None,
        description="The official case/docket number (Esas No.) found in the document, if present.",
    )


# =============================================================================
# Phase 2: Logic / Contradiction Analysis Models
# =============================================================================

class ContradictionType(str, Enum):
    """
    Classifies the logical nature of a detected inconsistency.

    Using `str` as a mixin ensures the enum serializes to its string value
    in JSON (e.g., "WITNESS_CONFLICT") without needing custom encoders.
    """
    FACTUAL_ERROR = "FACTUAL_ERROR"
    """
    A stated fact directly contradicts another stated fact in the same document.
    Example: Event A states a sum of 500,000 TL; Event B states 300,000 TL for
    the same obligation with no explanation for the discrepancy.
    """

    WITNESS_CONFLICT = "WITNESS_CONFLICT"
    """
    Two or more witness statements are irreconcilably at odds with each other
    or with documented facts. Covers both 'Çelişkili Beyan' (direct conflict)
    and 'Tevil Yollu İkrar' (qualified/evasive confession) patterns.
    Example: Witness X claims the contract was fully performed; expert witness
    Y's testimony shows only 40% completion.
    """

    TIMELINE_IMPOSSIBILITY = "TIMELINE_IMPOSSIBILITY"
    """
    The sequence or duration of events is logically or physically impossible.
    Example: A person is documented as attending a hearing in Istanbul and
    signing a contract in Ankara within the same hour.
    Example: A response deadline of 30 days was legally required but the
    subsequent action was taken only 5 days after the triggering event.
    """

    MISSING_INFO = "MISSING_INFO"
    """
    A critical piece of information is referenced but never provided, creating
    a logical gap that may affect the case outcome.
    Example: A contract mentions 12 units, but subsequent proceedings only
    account for 8 — the fate of 4 units is never documented.
    """


class Contradiction(BaseModel):
    """
    Represents a single detected logical inconsistency, conflict, or gap
    between two or more events in the legal timeline.
    """
    title: str = Field(
        ...,
        description=(
            "A short, punchy title for this contradiction (max 10 words). "
            "Must immediately convey the nature of the conflict to a lawyer. "
            "Example: 'Tanık Beyanı ile Ödeme Miktarı Çelişkisi'"
        ),
    )
    contradiction_type: ContradictionType = Field(
        ...,
        description="The logical category of this inconsistency.",
    )
    description: str = Field(
        ...,
        description=(
            "A detailed, attorney-grade explanation of the contradiction. "
            "Must: (1) identify which events conflict, (2) explain precisely HOW "
            "they conflict, (3) state the potential legal consequence if not resolved. "
            "Write in the same language as the source document."
        ),
    )
    involved_event_ids: List[int] = Field(
        ...,
        description=(
            "A list of 0-based indices into the 'events' array identifying every "
            "event involved in this contradiction. Must contain at least 1 element. "
            "Example: [2, 5] means events at index 2 and 5 are in conflict."
        ),
        min_length=1,
    )
    severity: str = Field(
        ...,
        description=(
            "The potential impact of this contradiction on the case outcome. "
            "Must be exactly one of: 'HIGH', 'MEDIUM', 'LOW'. "
            "HIGH = could reverse the verdict or invalidate a key claim. "
            "MEDIUM = weakens a position but does not overturn it alone. "
            "LOW = minor inconsistency or missing detail with limited impact."
        ),
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Your confidence that this is a genuine contradiction vs. a drafting "
            "imprecision or intentional legal nuance (e.g., 'Tevil Yollu İkrar'). "
            "0.0 = very uncertain, 1.0 = certain. Be conservative: flag ambiguous "
            "cases with lower scores rather than omitting them."
        ),
    )
    legal_basis: Optional[str] = Field(
        default=None,
        description=(
            "The specific Turkish legal concept, procedural rule, or doctrine that "
            "this contradiction implicates. Examples: 'HMK m.200 - Senetle İspat', "
            "'Çelişkili Beyan (Contradictio in terminis)', 'Tevil Yollu İkrar', "
            "'TBK m.112 - Borcun İfa Edilmemesi', 'CMK m.217 - Delil Serbestisi'."
        ),
    )
    recommended_action: Optional[str] = Field(
        default=None,
        description=(
            "A concrete, actionable recommendation for the attorney. "
            "Example: 'Bu tanığı çapraz sorguya çekin ve imza tarihine ilişkin "
            "telefon kayıtlarını delil olarak sunun.' "
            "Keep to 1-2 sentences."
        ),
    )

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"HIGH", "MEDIUM", "LOW"}
        if v not in allowed:
            raise ValueError(f"severity must be one of {allowed}, got '{v}'")
        return v

    @field_validator("involved_event_ids")
    @classmethod
    def validate_event_ids(cls, v: List[int]) -> List[int]:
        if any(i < 0 for i in v):
            raise ValueError("All involved_event_ids must be >= 0 (0-based index).")
        return sorted(set(v))  # Deduplicate and sort for deterministic output.


class LogicAnalysisResult(BaseModel):
    """
    The raw structured output returned by the logic analyzer LLM call.
    Contains only the contradiction-specific data before being merged with
    the timeline into the final AnalysisResult.
    """
    contradictions: List[Contradiction] = Field(
        ...,
        description=(
            "All detected contradictions, ordered by severity (HIGH first) "
            "then by confidence_score (descending)."
        ),
    )
    total_contradictions_found: int = Field(
        ...,
        ge=0,
        description="Must equal len(contradictions). Will be auto-corrected if wrong.",
    )
    risk_level: str = Field(
        ...,
        description=(
            "The overall case risk level based on the aggregate severity of all "
            "found contradictions. Must be one of: 'HIGH', 'MEDIUM', 'LOW', 'NONE'. "
            "NONE = no contradictions detected. "
            "HIGH = at least one HIGH severity contradiction exists. "
            "MEDIUM = at least one MEDIUM but no HIGH. "
            "LOW = only LOW severity contradictions."
        ),
    )
    analysis_notes: Optional[str] = Field(
        default=None,
        description=(
            "Optional: A 1-2 sentence meta-observation about the overall quality "
            "and reliability of the document, beyond individual contradictions. "
            "Example: 'Belge, özellikle tanık ifadelerinde yüksek düzeyde iç "
            "tutarsızlık barındırmaktadır; bağımsız delil desteği kritik önemdedir.'"
        ),
    )

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        allowed = {"HIGH", "MEDIUM", "LOW", "NONE"}
        if v not in allowed:
            raise ValueError(f"risk_level must be one of {allowed}, got '{v}'")
        return v


# =============================================================================
# Phase 3: Combined Final Response Model
# =============================================================================

class AnalysisResult(BaseModel):
    """
    The complete, merged output of a /analyze/deep request.
    Combines the Phase 1 timeline extraction with the Phase 2 logic analysis
    into a single, self-contained JSON object for the frontend.
    """

    # --- Timeline data (from Phase 1) ----------------------------------------
    events: List[TimelineEvent] = Field(
        ...,
        description="Chronologically ordered list of all extracted legal events.",
    )
    document_summary: str = Field(
        ...,
        description="2-3 sentence executive summary of the document.",
    )
    total_events_found: int = Field(..., ge=0)
    primary_jurisdiction: Optional[str] = Field(default=None)
    case_number: Optional[str] = Field(default=None)

    # --- Logic analysis data (from Phase 2) -----------------------------------
    contradictions: List[Contradiction] = Field(
        default_factory=list,
        description="All detected contradictions, sorted by severity.",
    )
    total_contradictions_found: int = Field(
        default=0,
        ge=0,
        description="Count of items in the contradictions list.",
    )
    risk_level: str = Field(
        default="NONE",
        description="Overall case risk: 'HIGH', 'MEDIUM', 'LOW', or 'NONE'.",
    )
    analysis_notes: Optional[str] = Field(
        default=None,
        description="Meta-observation about overall document reliability.",
    )

    @classmethod
    def from_phases(
        cls,
        timeline: TimelineResponse,
        logic: LogicAnalysisResult,
    ) -> "AnalysisResult":
        """
        Factory method: merges a TimelineResponse and a LogicAnalysisResult
        into a single flat AnalysisResult object.

        Separating the merge logic here keeps main.py clean and makes
        unit testing of the merge step trivial.
        """
        return cls(
            # Timeline fields
            events=timeline.events,
            document_summary=timeline.document_summary,
            total_events_found=timeline.total_events_found,
            primary_jurisdiction=timeline.primary_jurisdiction,
            case_number=timeline.case_number,
            # Logic analysis fields
            contradictions=logic.contradictions,
            total_contradictions_found=logic.total_contradictions_found,
            risk_level=logic.risk_level,
            analysis_notes=logic.analysis_notes,
        )
