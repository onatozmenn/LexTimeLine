import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Lightbulb,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { CategoryBadge } from "./CategoryBadge";
import type { ContradictionData } from "./ContradictionCard";

export interface TimelineEventData {
  date: string;
  description: string;
  source_page: number;
  entities: string[];
  category: string;
  significance?: string | null;
}

interface TimelineEventCardProps {
  event: TimelineEventData;
  index: number;
  isLast: boolean;
  /** Contradictions that reference this event by its 0-based index */
  flaggedBy?: ContradictionData[];
  /** Callback to switch to the contradiction tab and highlight a specific card */
  onContradictionClick?: (contradictionIndex: number) => void;
  /** When true, render a pulsing highlight ring (citation click from Chat) */
  highlighted?: boolean;
}

// Severity colour map for the inline contradiction chip
const SEVERITY_CHIP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  HIGH:   { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FECACA]", dot: "bg-[#EF4444]" },
  MEDIUM: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", border: "border-[#FDE68A]", dot: "bg-[#F59E0B]" },
  LOW:    { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]", border: "border-[#BFDBFE]", dot: "bg-[#3B82F6]" },
};

const SEVERITY_LABELS: Record<string, string> = {
  HIGH: "Yüksek",
  MEDIUM: "Orta",
  LOW: "Düşük",
};

export function TimelineEventCard({
  event,
  index,
  isLast,
  flaggedBy = [],
  onContradictionClick,
  highlighted = false,
}: TimelineEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isFlagged = flaggedBy.length > 0;
  const hasDetails = event.entities.length > 0 || !!event.significance || isFlagged;

  // The highest severity among all contradictions referencing this event
  const topSeverity =
    flaggedBy.find((c) => c.severity === "HIGH")?.severity ??
    flaggedBy.find((c) => c.severity === "MEDIUM")?.severity ??
    flaggedBy[0]?.severity;

  return (
    <div className="flex gap-4 group">
      {/* ── Timeline spine ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`
            w-8 h-8 rounded-full border-2 flex items-center justify-center
            transition-all duration-200 z-10
            ${expanded
              ? "bg-[#1D4ED8] border-[#1D4ED8]"
              : isFlagged
              ? "bg-[#FEF2F2] dark:bg-[#450A0A] border-[#FCA5A5] group-hover:border-[#EF4444]"
              : "bg-white dark:bg-[#1E293B] border-[#D0D5DD] dark:border-[#475569] group-hover:border-[#2D6BE4]"
            }
          `}
          style={{ minWidth: 32, minHeight: 32 }}
        >
          {isFlagged && !expanded ? (
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                topSeverity === "HIGH"
                  ? "text-[#DC2626]"
                  : topSeverity === "MEDIUM"
                  ? "text-[#D97706]"
                  : "text-[#3B82F6]"
              }`}
              strokeWidth={2.5}
            />
          ) : (
            <span
              className={`text-xs transition-colors ${
                expanded ? "text-white" : "text-[#667085]"
              }`}
              style={{ fontWeight: 600 }}
            >
              {index + 1}
            </span>
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 mt-1 mb-1 transition-colors ${
              isFlagged ? "bg-[#FECACA]" : "bg-[#E4E7EC] dark:bg-[#334155]"
            }`}
            style={{ minHeight: 24 }}
          />
        )}
      </div>

      {/* ── Card ────────────────────────────────────────────────────── */}
      <div
        className={`
          flex-1 rounded-xl border bg-white dark:bg-[#1E293B] mb-4 overflow-hidden
          transition-all duration-200 shadow-sm
          ${highlighted
            ? "ring-2 ring-[#2D6BE4] ring-offset-2 border-[#93AEED]"
            : expanded
            ? isFlagged
              ? "border-[#FCA5A5]"
              : "border-[#93AEED]"
            : isFlagged
            ? "border-[#FECACA] hover:border-[#FCA5A5]"
            : "border-[#E4E7EC] hover:border-[#93AEED]"
          }
        `}
      >
        {/* ── Contradiction flag stripe ────────────────────────────── */}
        {isFlagged && (
          <div
            className={`h-1 w-full ${
              topSeverity === "HIGH"
                ? "bg-[#DC2626]"
                : topSeverity === "MEDIUM"
                ? "bg-[#D97706]"
                : "bg-[#3B82F6]"
            }`}
          />
        )}

        {/* ── Header (always visible) ──────────────────────────────── */}
        <button
          className="w-full text-left px-5 py-4 flex items-start gap-4"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          style={{ cursor: hasDetails ? "pointer" : "default" }}
        >
          {/* Date pill */}
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-[#F2F4F7] dark:bg-[#334155] rounded-lg px-3 py-1.5 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#667085] dark:text-[#94A3B8]" strokeWidth={1.8} />
            <span
              className="text-xs text-[#344054] dark:text-[#CBD5E1]"
              style={{ fontWeight: 600, fontFamily: "monospace" }}
            >
              {event.date}
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm text-[#101828] dark:text-white" style={{ lineHeight: 1.6 }}>
              {event.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryBadge category={event.category} size="sm" />
              <span className="flex items-center gap-1 text-[10px] text-[#98A2B3]">
                <FileText className="w-3 h-3" />
                Sayfa {event.source_page}
              </span>
              {/* Contradiction chips */}
              {flaggedBy.map((c, ci) => {
                const chip = SEVERITY_CHIP[c.severity];
                return (
                  <button
                    key={ci}
                    onClick={(e) => {
                      e.stopPropagation();
                      onContradictionClick?.(ci);
                    }}
                    className={`
                      inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5
                      border transition-opacity hover:opacity-75
                      ${chip.bg} ${chip.text} ${chip.border}
                    `}
                    style={{ fontWeight: 600 }}
                  >
                    <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
                    Çelişki · {SEVERITY_LABELS[c.severity]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expand toggle */}
          {hasDetails && (
            <div className="flex-shrink-0 mt-0.5">
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[#667085]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#667085]" />
              )}
            </div>
          )}
        </button>

        {/* ── Expanded detail panel ────────────────────────────────── */}
        {expanded && hasDetails && (
          <div className="border-t border-[#F2F4F7] dark:border-[#334155] bg-[#FAFAFA] dark:bg-[#0F172A] px-5 py-4 space-y-4">
            {event.entities.length > 0 && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-1.5 text-xs text-[#344054] dark:text-[#CBD5E1]"
                  style={{ fontWeight: 600 }}
                >
                  <Users className="w-3.5 h-3.5 text-[#667085]" />
                  İlgili Taraflar
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.entities.map((entity, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white dark:bg-[#334155] border border-[#D0D5DD] dark:border-[#475569] rounded-full px-3 py-1 text-[#344054] dark:text-[#CBD5E1]"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.significance && (
              <div className="flex items-start gap-2 bg-[#FFFAEB] dark:bg-[#422006] border border-[#FDE68A] dark:border-[#78350F] rounded-lg px-4 py-3">
                <Lightbulb className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#92400E] dark:text-[#FCD34D]" style={{ lineHeight: 1.6 }}>
                  <strong className="text-[#78350F] dark:text-[#FDE68A]">Hukuki Önem:</strong>{" "}
                  {event.significance}
                </p>
              </div>
            )}

            {/* Contradiction references */}
            {isFlagged && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-1.5 text-xs text-[#344054] dark:text-[#CBD5E1]"
                  style={{ fontWeight: 600 }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                  Bu olayı içeren çelişkiler
                </div>
                {flaggedBy.map((c, ci) => {
                  const chip = SEVERITY_CHIP[c.severity];
                  return (
                    <button
                      key={ci}
                      onClick={() => onContradictionClick?.(ci)}
                      className={`
                        w-full text-left flex items-start gap-3 p-3 rounded-lg border
                        transition-all hover:opacity-80 active:scale-[0.99]
                        ${chip.bg} ${chip.border}
                      `}
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${chip.dot}`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-xs ${chip.text}`}
                          style={{ fontWeight: 600 }}
                        >
                          {c.title}
                        </p>
                        <p className="text-xs text-[#667085] mt-0.5 line-clamp-2">
                          {c.description.slice(0, 120)}…
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}