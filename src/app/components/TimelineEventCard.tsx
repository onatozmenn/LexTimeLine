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
  flaggedBy?: ContradictionData[];
  onContradictionClick?: (contradictionIndex: number) => void;
  highlighted?: boolean;
}

const SEVERITY_CHIP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  HIGH: {
    bg: "bg-severity-high-bg",
    text: "text-severity-high-text",
    border: "border-severity-high-border",
    dot: "bg-severity-high-solid",
  },
  MEDIUM: {
    bg: "bg-severity-medium-bg",
    text: "text-severity-medium-text",
    border: "border-severity-medium-border",
    dot: "bg-severity-medium-solid",
  },
  LOW: {
    bg: "bg-severity-low-bg",
    text: "text-severity-low-text",
    border: "border-severity-low-border",
    dot: "bg-severity-low-solid",
  },
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

  const topSeverity =
    flaggedBy.find((c) => c.severity === "HIGH")?.severity ??
    flaggedBy.find((c) => c.severity === "MEDIUM")?.severity ??
    flaggedBy[0]?.severity;

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={`
            w-8 h-8 rounded-full border-2 flex items-center justify-center
            transition-all duration-200 z-10
            ${expanded
              ? "bg-severity-low-solid border-severity-low-solid"
              : isFlagged
              ? "bg-severity-high-bg border-severity-high-border group-hover:border-severity-high-solid"
              : "bg-surface-card border-border-default group-hover:border-border-accent"
            }
          `}
          style={{ minWidth: 32, minHeight: 32 }}
        >
          {isFlagged && !expanded ? (
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                topSeverity === "HIGH"
                  ? "text-severity-high-solid"
                  : topSeverity === "MEDIUM"
                  ? "text-severity-medium-solid"
                  : "text-severity-low-solid"
              }`}
              strokeWidth={2.5}
            />
          ) : (
            <span className={`text-xs transition-colors ${expanded ? "text-white" : "text-text-muted"}`} style={{ fontWeight: 600 }}>
              {index + 1}
            </span>
          )}
        </div>
        {!isLast && (
          <div
            className={`w-px flex-1 mt-1 mb-1 transition-colors ${
              isFlagged ? "bg-severity-high-border" : "bg-border-subtle"
            }`}
            style={{ minHeight: 24 }}
          />
        )}
      </div>

      <div
        className={`
          flex-1 rounded-xl border bg-surface-card mb-4 overflow-hidden
          transition-all duration-200 shadow-sm
          ${highlighted
            ? "ring-2 ring-accent-primary ring-offset-2 border-accent-primary-subtle"
            : expanded
            ? isFlagged
              ? "border-severity-high-border"
              : "border-accent-primary-subtle"
            : isFlagged
            ? "border-severity-high-border hover:border-severity-high-solid"
            : "border-border-subtle hover:border-accent-primary-subtle"
          }
        `}
      >
        {isFlagged && (
          <div
            className={`h-1 w-full ${
              topSeverity === "HIGH"
                ? "bg-severity-high-solid"
                : topSeverity === "MEDIUM"
                ? "bg-severity-medium-solid"
                : "bg-severity-low-solid"
            }`}
          />
        )}

        <div
          className="w-full text-left px-5 py-4 flex items-start gap-4"
          onClick={() => hasDetails && setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (!hasDetails) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          role={hasDetails ? "button" : undefined}
          tabIndex={hasDetails ? 0 : -1}
          aria-expanded={hasDetails ? expanded : undefined}
          style={{ cursor: hasDetails ? "pointer" : "default" }}
        >
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-surface-muted rounded-lg px-3 py-1.5 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-text-muted" strokeWidth={1.8} />
            <span className="text-xs text-text-secondary" style={{ fontWeight: 600, fontFamily: "monospace" }}>
              {event.date}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm text-text-primary" style={{ lineHeight: 1.6 }}>
              {event.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryBadge category={event.category} size="sm" />
              <span className="flex items-center gap-1 text-[10px] text-text-subtle">
                <FileText className="w-3 h-3" />
                Sayfa {event.source_page}
              </span>
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

          {hasDetails && (
            <div className="flex-shrink-0 mt-0.5">
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </div>
          )}
        </div>

        {expanded && hasDetails && (
          <div className="border-t border-border-subtle bg-surface-page px-5 py-4 space-y-4">
            {event.entities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary" style={{ fontWeight: 600 }}>
                  <Users className="w-3.5 h-3.5 text-text-muted" />
                  İlgili Taraflar
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.entities.map((entity, i) => (
                    <span
                      key={i}
                      className="text-xs bg-surface-card border border-border-default rounded-full px-3 py-1 text-text-secondary"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.significance && (
              <div className="flex items-start gap-2 bg-severity-medium-bg border border-severity-medium-border rounded-lg px-4 py-3">
                <Lightbulb className="w-4 h-4 text-severity-medium-solid flex-shrink-0 mt-0.5" />
                <p className="text-xs text-severity-medium-text" style={{ lineHeight: 1.6 }}>
                  <strong className="text-severity-medium-text">Hukuki Önem:</strong> {event.significance}
                </p>
              </div>
            )}

            {isFlagged && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary" style={{ fontWeight: 600 }}>
                  <AlertTriangle className="w-3.5 h-3.5 text-severity-high-solid" />
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
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${chip.dot}`} />
                      <div className="min-w-0">
                        <p className={`text-xs ${chip.text}`} style={{ fontWeight: 600 }}>
                          {c.title}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                          {c.description.slice(0, 120)}...
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
