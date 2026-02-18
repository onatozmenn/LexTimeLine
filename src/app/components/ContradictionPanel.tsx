import { useState, useMemo } from "react";
import { ShieldAlert, ShieldCheck, ShieldX, SlidersHorizontal } from "lucide-react";
import { ContradictionCard, type ContradictionData } from "./ContradictionCard";

interface ContradictionPanelProps {
  contradictions: ContradictionData[];
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  analysisNotes?: string | null;
  onEventClick?: (eventId: number) => void;
}

// ── Risk level config ────────────────────────────────────────────────────────

const RISK_CONFIG = {
  HIGH: {
    bg: "bg-gradient-to-r from-[#7F1D1D] to-[#DC2626]",
    icon: <ShieldX className="w-6 h-6 text-white" strokeWidth={1.8} />,
    label: "Yüksek Risk",
    sub: "Dava sonucunu etkileyebilecek ciddi çelişkiler tespit edildi.",
  },
  MEDIUM: {
    bg: "bg-gradient-to-r from-[#78350F] to-[#D97706]",
    icon: <ShieldAlert className="w-6 h-6 text-white" strokeWidth={1.8} />,
    label: "Orta Risk",
    sub: "Bazı tutarsızlıklar mevcut; derinlemesine inceleme önerilir.",
  },
  LOW: {
    bg: "bg-gradient-to-r from-[#1E3A5F] to-[#3B82F6]",
    icon: <ShieldAlert className="w-6 h-6 text-white" strokeWidth={1.8} />,
    label: "Düşük Risk",
    sub: "Küçük tutarsızlıklar saptandı; dava bütünlüğü genel itibarıyla sağlam.",
  },
  NONE: {
    bg: "bg-gradient-to-r from-[#14532D] to-[#16A34A]",
    icon: <ShieldCheck className="w-6 h-6 text-white" strokeWidth={1.8} />,
    label: "Çelişki Yok",
    sub: "Belgede mantıksal tutarsızlık veya çelişki tespit edilemedi.",
  },
} as const;

const SEVERITY_FILTER_LABELS = ["Tümü", "HIGH", "MEDIUM", "LOW"] as const;
type SeverityFilter = (typeof SEVERITY_FILTER_LABELS)[number];

const SEVERITY_DISPLAY: Record<string, string> = {
  HIGH: "Yüksek",
  MEDIUM: "Orta",
  LOW: "Düşük",
};

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
  MEDIUM: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]",
  LOW: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
};

// ── Component ────────────────────────────────────────────────────────────────

export function ContradictionPanel({
  contradictions,
  riskLevel,
  analysisNotes,
  onEventClick,
}: ContradictionPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("Tümü");
  const riskCfg = RISK_CONFIG[riskLevel];

  const filtered = useMemo(() => {
    if (severityFilter === "Tümü") return contradictions;
    return contradictions.filter((c) => c.severity === severityFilter);
  }, [contradictions, severityFilter]);

  const counts = useMemo(
    () => ({
      HIGH: contradictions.filter((c) => c.severity === "HIGH").length,
      MEDIUM: contradictions.filter((c) => c.severity === "MEDIUM").length,
      LOW: contradictions.filter((c) => c.severity === "LOW").length,
    }),
    [contradictions]
  );

  return (
    <div className="space-y-5">
      {/* ── Risk Banner ──────────────────────────────────────────────── */}
      <div className={`rounded-2xl overflow-hidden shadow-sm ${riskCfg.bg}`}>
        <div className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            {riskCfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-white"
              style={{ fontWeight: 700, fontSize: "1.125rem" }}
            >
              {riskCfg.label}
            </p>
            <p className="text-white/80 text-sm mt-0.5">{riskCfg.sub}</p>
          </div>
          {contradictions.length > 0 && (
            <div className="flex-shrink-0 bg-white/20 rounded-xl px-4 py-2 text-center">
              <p
                className="text-white"
                style={{ fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}
              >
                {contradictions.length}
              </p>
              <p className="text-white/70 text-xs mt-0.5">Çelişki</p>
            </div>
          )}
        </div>

        {/* Severity breakdown bar */}
        {contradictions.length > 0 && (
          <div className="bg-black/20 px-6 py-3 flex items-center gap-4 flex-wrap">
            {(["HIGH", "MEDIUM", "LOW"] as const).map((sev) =>
              counts[sev] > 0 ? (
                <div key={sev} className="flex items-center gap-1.5">
                  <span className="text-white/60 text-xs">{SEVERITY_DISPLAY[sev]}:</span>
                  <span
                    className="text-white text-xs"
                    style={{ fontWeight: 700 }}
                  >
                    {counts[sev]}
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* ── Analysis notes ───────────────────────────────────────────── */}
      {analysisNotes && (
        <div className="bg-[#F5F3FF] dark:bg-[#2E1065] border border-[#DDD6FE] dark:border-[#5B21B6] rounded-xl px-4 py-4">
          <p className="text-xs text-[#5B21B6] dark:text-[#C4B5FD] mb-1" style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Analist Notu
          </p>
          <p className="text-sm text-[#4C1D95] dark:text-[#DDD6FE]" style={{ lineHeight: 1.7 }}>
            {analysisNotes}
          </p>
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      {contradictions.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-1.5 text-sm text-[#344054] dark:text-[#CBD5E1]"
            style={{ fontWeight: 500 }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#667085]" />
            Filtrele:
          </div>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_FILTER_LABELS.map((label) => {
              const isActive = severityFilter === label;
              const count =
                label === "Tümü"
                  ? contradictions.length
                  : counts[label as keyof typeof counts];
              const colorClass =
                label !== "Tümü" ? SEVERITY_COLORS[label] : "";

              return (
                <button
                  key={label}
                  onClick={() => setSeverityFilter(label)}
                  className={`
                    text-xs rounded-full px-3 py-1.5 transition-all border
                    ${isActive
                      ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                      : label === "Tümü"
                      ? "bg-white dark:bg-[#334155] text-[#344054] dark:text-[#CBD5E1] border-[#D0D5DD] dark:border-[#475569] hover:border-[#2D6BE4]"
                      : `${colorClass} hover:opacity-80`
                    }
                  `}
                  style={{ fontWeight: 500 }}
                >
                  {label === "Tümü" ? `Tümü (${count})` : `${SEVERITY_DISPLAY[label]} (${count})`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────────── */}
      {contradictions.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#F0FDF4] dark:bg-[#052e16] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-[#16A34A]" />
          </div>
          <p className="text-sm text-[#344054] dark:text-[#CBD5E1]" style={{ fontWeight: 500 }}>
            Çelişki bulunamadı
          </p>
          <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
            Belge iç tutarlılık açısından sorunsuz görünmektedir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-[#667085] py-8">
              Bu önem düzeyinde çelişki bulunamadı.
            </p>
          ) : (
            filtered.map((contradiction, i) => (
              <ContradictionCard
                key={`${contradiction.contradiction_type}-${i}`}
                contradiction={contradiction}
                index={i}
                onEventClick={onEventClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
