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

const SEVERITY_CONFIG = {
  HIGH: {
    label: "Yüksek Önem",
    border: "border-severity-high-border",
    headerBg: "bg-gradient-to-r from-severity-high-text to-severity-high-solid",
    badgeBg: "bg-severity-high-bg",
    badgeText: "text-severity-high-text",
    badgeBorder: "border-severity-high-border",
    dot: "bg-severity-high-solid",
    icon: <AlertTriangle className="w-4 h-4 text-white" strokeWidth={2} />,
    confidenceBar: "bg-severity-high-solid",
    ringColor: "ring-severity-high-border",
  },
  MEDIUM: {
    label: "Orta Önem",
    border: "border-severity-medium-border",
    headerBg: "bg-gradient-to-r from-severity-medium-text to-severity-medium-solid",
    badgeBg: "bg-severity-medium-bg",
    badgeText: "text-severity-medium-text",
    badgeBorder: "border-severity-medium-border",
    dot: "bg-severity-medium-solid",
    icon: <AlertCircle className="w-4 h-4 text-white" strokeWidth={2} />,
    confidenceBar: "bg-severity-medium-solid",
    ringColor: "ring-severity-medium-border",
  },
  LOW: {
    label: "Düşük Önem",
    border: "border-severity-low-border",
    headerBg: "bg-gradient-to-r from-accent-primary-strong to-severity-low-solid",
    badgeBg: "bg-severity-low-bg",
    badgeText: "text-severity-low-text",
    badgeBorder: "border-severity-low-border",
    dot: "bg-severity-low-solid",
    icon: <Info className="w-4 h-4 text-white" strokeWidth={2} />,
    confidenceBar: "bg-severity-low-solid",
    ringColor: "ring-severity-low-border",
  },
} as const;

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

export function ContradictionCard({
  contradiction,
  index,
  onEventClick,
}: ContradictionCardProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = SEVERITY_CONFIG[contradiction.severity];
  const confidencePct = Math.round(contradiction.confidence_score * 100);

  return (
    <div
      className={`
        rounded-xl border-2 overflow-hidden bg-surface-card shadow-sm
        transition-all duration-200
        ${cfg.border}
        ${expanded ? `ring-2 ring-offset-1 ${cfg.ringColor}` : ""}
      `}
    >
      <button className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary" onClick={() => setExpanded((v) => !v)}>
        <div className={`px-4 py-3 ${cfg.headerBg}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {cfg.icon}
              </div>
              <span className="text-white truncate" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {contradiction.title}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-white/80 text-xs hidden sm:block" style={{ fontWeight: 500 }}>
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

        {!expanded && (
          <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap bg-surface-card">
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
            <span className="inline-flex items-center gap-1 text-xs text-text-muted">
              {TYPE_ICONS[contradiction.contradiction_type]}
              {TYPE_LABELS[contradiction.contradiction_type]}
            </span>
            <span className="text-xs text-text-subtle">
              Olay {contradiction.involved_event_ids.map((id) => `#${id + 1}`).join(" & ")}
            </span>
          </div>
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-border-subtle">
          <div className="px-4 py-3 flex flex-wrap items-center gap-3">
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

            <span
              className="inline-flex items-center gap-1.5 text-xs bg-surface-muted border border-border-subtle rounded-full px-2.5 py-1 text-text-secondary"
              style={{ fontWeight: 500 }}
            >
              {TYPE_ICONS[contradiction.contradiction_type]}
              {TYPE_LABELS[contradiction.contradiction_type]}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-text-muted">Güven:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-24 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${cfg.confidenceBar}`} style={{ width: `${confidencePct}%` }} />
                </div>
                <span className={`text-xs ${cfg.badgeText}`} style={{ fontWeight: 700, minWidth: "2.5rem" }}>
                  {confidencePct}%
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            <p className="text-sm text-text-secondary" style={{ lineHeight: 1.75 }}>
              {contradiction.description}
            </p>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-2" style={{ fontWeight: 600 }}>
              <Link2 className="w-3.5 h-3.5 text-text-muted" />
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
                    hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
                  `}
                  style={{ fontWeight: 600 }}
                >
                  Olay #{eventId + 1}
                </button>
              ))}
            </div>
          </div>

          {contradiction.legal_basis && (
            <div className="px-4 py-3 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-text-accent mb-0.5" style={{ fontWeight: 600 }}>
                  Hukuki Dayanak
                </p>
                <p className="text-xs text-text-secondary" style={{ lineHeight: 1.6 }}>
                  {contradiction.legal_basis}
                </p>
              </div>
            </div>
          )}

          {contradiction.recommended_action && (
            <div className="px-4 py-3 bg-severity-medium-bg flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-severity-medium-solid flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-severity-medium-text mb-0.5" style={{ fontWeight: 600 }}>
                  Önerilen Eylem
                </p>
                <p className="text-xs text-severity-medium-text" style={{ lineHeight: 1.7 }}>
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
