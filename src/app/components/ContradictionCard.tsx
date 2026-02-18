import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Scale,
  Lightbulb,
  Link2,
  BookOpen,
} from "lucide-react";

export interface ContradictionData {
  title: string;
  contradiction_type:
    | "FACTUAL_ERROR"
    | "WITNESS_CONFLICT"
    | "TIMELINE_IMPOSSIBILITY"
    | "MISSING_INFO";
  description: string;
  involved_event_ids: number[];
  severity: "HIGH" | "MEDIUM" | "LOW";
  confidence_score: number;
  legal_basis?: string | null;
  recommended_action?: string | null;
}

interface ContradictionCardProps {
  contradiction: ContradictionData;
  index: number;
  onEventClick?: (eventId: number) => void;
}

// ── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  HIGH: {
    label: "Yüksek Önem",
    border: "border-[#FCA5A5]",
    headerBg: "bg-gradient-to-r from-[#7F1D1D] to-[#B91C1C]",
    badgeBg: "bg-[#FEF2F2]",
    badgeText: "text-[#B91C1C]",
    badgeBorder: "border-[#FECACA]",
    dot: "bg-[#EF4444]",
    icon: <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2} />,
    confidenceBar: "bg-[#EF4444]",
    ringColor: "ring-[#FCA5A5]",
  },
  MEDIUM: {
    label: "Orta Önem",
    border: "border-[#FCD34D]",
    headerBg: "bg-gradient-to-r from-[#78350F] to-[#D97706]",
    badgeBg: "bg-[#FFFBEB]",
    badgeText: "text-[#B45309]",
    badgeBorder: "border-[#FDE68A]",
    dot: "bg-[#F59E0B]",
    icon: <AlertCircle className="w-4 h-4 text-white" strokeWidth={2} />,
    confidenceBar: "bg-[#F59E0B]",
    ringColor: "ring-[#FCD34D]",
  },
  LOW: {
    label: "Düşük Önem",
    border: "border-[#93C5FD]",
    headerBg: "bg-gradient-to-r from-[#1E3A5F] to-[#3B82F6]",
    badgeBg: "bg-[#EFF6FF]",
    badgeText: "text-[#1D4ED8]",
    badgeBorder: "border-[#BFDBFE]",
    dot: "bg-[#3B82F6]",
    icon: <Info className="w-4 h-4 text-white" strokeWidth={2} />,
    confidenceBar: "bg-[#3B82F6]",
    ringColor: "ring-[#93C5FD]",
  },
} as const;

// ── Type config ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ContradictionData["contradiction_type"], string> = {
  FACTUAL_ERROR: "Olgusal Hata",
  WITNESS_CONFLICT: "Tanık Çatışması",
  TIMELINE_IMPOSSIBILITY: "Zaman Çizelgesi Hatası",
  MISSING_INFO: "Eksik Bilgi",
};

const TYPE_ICONS: Record<ContradictionData["contradiction_type"], React.ReactNode> = {
  FACTUAL_ERROR: <AlertCircle className="w-3 h-3" />,
  WITNESS_CONFLICT: <Scale className="w-3 h-3" />,
  TIMELINE_IMPOSSIBILITY: <AlertTriangle className="w-3 h-3" />,
  MISSING_INFO: <Info className="w-3 h-3" />,
};

// ── Component ────────────────────────────────────────────────────────────────

export function ContradictionCard({
  contradiction,
  index,
  onEventClick,
}: ContradictionCardProps) {
  const [expanded, setExpanded] = useState(index === 0); // First card starts open.
  const cfg = SEVERITY_CONFIG[contradiction.severity];
  const confidencePct = Math.round(contradiction.confidence_score * 100);

  return (
    <div
      className={`
        rounded-xl border-2 overflow-hidden bg-white dark:bg-[#1E293B] shadow-sm
        transition-all duration-200
        ${cfg.border}
        ${expanded ? `ring-2 ring-offset-1 ${cfg.ringColor}` : ""}
      `}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <button
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className={`px-4 py-3 ${cfg.headerBg}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Severity icon */}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {cfg.icon}
              </div>
              {/* Title */}
              <span
                className="text-white truncate"
                style={{ fontWeight: 600, fontSize: "0.875rem" }}
              >
                {contradiction.title}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-white/80 text-xs hidden sm:block"
                style={{ fontWeight: 500 }}
              >
                #{index + 1}
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-white/80" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white/80" />
              )}
            </div>
          </div>
        </div>

        {/* ── Collapsed meta row ─────────────────────────────────────── */}
        {!expanded && (
          <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap bg-white dark:bg-[#1E293B]">
            {/* Severity badge */}
            <span
              className={`
                inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1
                border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}
              `}
              style={{ fontWeight: 600 }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            {/* Type badge */}
            <span className="inline-flex items-center gap-1 text-xs text-[#667085] dark:text-[#94A3B8]">
              {TYPE_ICONS[contradiction.contradiction_type]}
              {TYPE_LABELS[contradiction.contradiction_type]}
            </span>
            {/* Event chips */}
            <span className="text-xs text-[#98A2B3] dark:text-[#64748B]">
              Olay {contradiction.involved_event_ids.map((id) => `#${id + 1}`).join(" & ")}
            </span>
          </div>
        )}
      </button>

      {/* ── Expanded body ───────────────────────────────────────────── */}
      {expanded && (
        <div className="divide-y divide-[#F2F4F7] dark:divide-[#334155]">
          {/* Badges + confidence row */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-3">
            {/* Severity badge */}
            <span
              className={`
                inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border
                ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}
              `}
              style={{ fontWeight: 600 }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>

            {/* Type badge */}
            <span
              className="inline-flex items-center gap-1.5 text-xs bg-[#F9FAFB] dark:bg-[#334155] border border-[#E4E7EC] dark:border-[#475569] rounded-full px-2.5 py-1 text-[#344054] dark:text-[#CBD5E1]"
              style={{ fontWeight: 500 }}
            >
              {TYPE_ICONS[contradiction.contradiction_type]}
              {TYPE_LABELS[contradiction.contradiction_type]}
            </span>

            {/* Confidence meter */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-[#667085] dark:text-[#94A3B8]">Güven:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-24 h-1.5 bg-[#E4E7EC] dark:bg-[#334155] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${cfg.confidenceBar}`}
                    style={{ width: `${confidencePct}%` }}
                  />
                </div>
                <span
                  className={`text-xs ${cfg.badgeText}`}
                  style={{ fontWeight: 700, minWidth: "2.5rem" }}
                >
                  {confidencePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-4 py-4">
            <p className="text-sm text-[#344054] dark:text-[#CBD5E1]" style={{ lineHeight: 1.75 }}>
              {contradiction.description}
            </p>
          </div>

          {/* Involved events */}
          <div className="px-4 py-3">
            <div
              className="flex items-center gap-1.5 text-xs text-[#344054] dark:text-[#CBD5E1] mb-2"
              style={{ fontWeight: 600 }}
            >
              <Link2 className="w-3.5 h-3.5 text-[#667085]" />
              İlgili Olaylar
            </div>
            <div className="flex flex-wrap gap-2">
              {contradiction.involved_event_ids.map((eventId) => (
                <button
                  key={eventId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(eventId);
                  }}
                  className={`
                    text-xs rounded-full px-3 py-1.5 border transition-all
                    ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}
                    hover:opacity-80 active:scale-95
                  `}
                  style={{ fontWeight: 600 }}
                >
                  Olay #{eventId + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Legal basis */}
          {contradiction.legal_basis && (
            <div className="px-4 py-3 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-[#6D28D9] flex-shrink-0 mt-0.5" />
              <div>
                <p
                  className="text-xs text-[#5B21B6] mb-0.5"
                  style={{ fontWeight: 600 }}
                >
                  Hukuki Dayanak
                </p>
                <p className="text-xs text-[#4C1D95]" style={{ lineHeight: 1.6 }}>
                  {contradiction.legal_basis}
                </p>
              </div>
            </div>
          )}

          {/* Recommended action */}
          {contradiction.recommended_action && (
            <div className="px-4 py-3 bg-[#FFFBEB] dark:bg-[#422006] flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[#92400E] dark:text-[#FCD34D] mb-0.5" style={{ fontWeight: 600 }}>
                  Önerilen Eylem
                </p>
                <p className="text-xs text-[#78350F] dark:text-[#FDE68A]" style={{ lineHeight: 1.7 }}>
                  {contradiction.recommended_action}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
