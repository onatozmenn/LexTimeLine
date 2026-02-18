import { useState, useMemo, useCallback, useEffect } from "react";
import {
  RotateCcw,
  Scale,
  Hash,
  MapPin,
  FileSearch,
  Filter,
  Clock,
  ShieldAlert,
  Network,
  MessageCircle,
} from "lucide-react";
import { TimelineEventCard, type TimelineEventData } from "./TimelineEventCard";
import { CategoryBadge } from "./CategoryBadge";
import { ContradictionPanel } from "./ContradictionPanel";
import type { ContradictionData } from "./ContradictionCard";
import { GraphView } from "./GraphView";
import { ChatInterface } from "./ChatInterface";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisResultData {
  // Timeline (Phase 1)
  events: TimelineEventData[];
  document_summary: string;
  total_events_found: number;
  primary_jurisdiction?: string | null;
  case_number?: string | null;
  // Logic analysis (Phase 2)
  contradictions: ContradictionData[];
  total_contradictions_found: number;
  risk_level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  analysis_notes?: string | null;
}

interface TimelineViewProps {
  data: AnalysisResultData;
  fileName: string;
  onReset: () => void;
}

// ── Risk badge ───────────────────────────────────────────────────────────────

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH:   { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", label: "Yüksek Risk" },
  MEDIUM: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", label: "Orta Risk" },
  LOW:    { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]", label: "Düşük Risk" },
  NONE:   { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", label: "Risk Yok" },
};

const ALL_CATEGORIES = "Tümü";

// ── Component ────────────────────────────────────────────────────────────────

export function TimelineView({ data, fileName, onReset }: TimelineViewProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "contradictions" | "graph" | "chat">("timeline");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  /** 0-based index of an event that should be highlighted after a citation click */
  const [highlightedEventIdx, setHighlightedEventIdx] = useState<number | null>(null);

  // Maps each event's 0-based index → contradictions that reference it
  const eventContradictionMap = useMemo(() => {
    const map = new Map<number, ContradictionData[]>();
    data.contradictions.forEach((c) => {
      c.involved_event_ids.forEach((eventId) => {
        if (!map.has(eventId)) map.set(eventId, []);
        map.get(eventId)!.push(c);
      });
    });
    return map;
  }, [data.contradictions]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.events.map((e) => e.category)));
    return [ALL_CATEGORIES, ...cats];
  }, [data.events]);

  const filtered = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) return data.events;
    return data.events.filter((e) => e.category === selectedCategory);
  }, [data.events, selectedCategory]);

  // When user clicks a contradiction chip inside an event card, switch to
  // the contradiction tab. We also accept a global event → contradiction jump.
  const handleContradictionClick = useCallback(() => {
    setActiveTab("contradictions");
  }, []);

  // When user clicks an event link inside a ContradictionCard, switch back
  // to the timeline tab.
  const handleEventClick = useCallback((_eventId: number) => {
    setActiveTab("timeline");
    // In a real app with a virtualized list, you'd scroll to the event here.
  }, []);

  // Citation click from the Chat tab:
  // 1. Switch to the timeline tab
  // 2. Highlight that event card with a blue ring
  // 3. Scroll to it
  // 4. Clear highlight after 3.5 s
  const handleCitationClick = useCallback((eventIdx: number) => {
    setSelectedCategory(ALL_CATEGORIES); // show all so the card is visible
    setActiveTab("timeline");
    setHighlightedEventIdx(eventIdx);
  }, []);

  // Scroll to highlighted event after the timeline tab renders
  useEffect(() => {
    if (highlightedEventIdx === null) return;
    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`tl-event-${highlightedEventIdx}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    // Clear highlight ring after 3.5 s
    const clearTimer = setTimeout(() => setHighlightedEventIdx(null), 3500);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightedEventIdx]);

  const riskBadge = RISK_BADGE[data.risk_level];

  return (
    <div
      className={`w-full mx-auto space-y-5 ${activeTab === "graph" || activeTab === "chat" ? "max-w-6xl" : "max-w-3xl"}`}
      style={{ transition: "max-width 0.3s ease" }}
    >

      {/* ── Document header card ───────────────────────────────────── */}
      <div className="rounded-2xl border border-[#D0D5DD] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden transition-colors duration-200">
        {/* Gradient banner */}
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D6BE4] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-white/70 text-xs mb-0.5">Analiz Edilen Belge</p>
                <h2 className="text-white truncate" style={{ fontWeight: 600 }}>
                  {fileName}
                </h2>
              </div>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm rounded-lg px-4 py-2 transition-colors flex-shrink-0"
              style={{ fontWeight: 500 }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Yeni Belge
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="px-6 py-4 flex flex-wrap gap-4 border-b border-[#F2F4F7] dark:border-[#334155]">
          <MetaItem
            icon={<FileSearch className="w-4 h-4 text-[#667085]" />}
            label="Olay"
            value={String(data.total_events_found)}
            highlight
          />
          {data.total_contradictions_found > 0 && (
            <button
              onClick={() => setActiveTab("contradictions")}
              className="flex items-center gap-2 group"
            >
              <MetaItem
                icon={<ShieldAlert className="w-4 h-4 text-[#667085]" />}
                label="Çelişki"
                value={String(data.total_contradictions_found)}
                highlight
                highlightColor={
                  data.risk_level === "HIGH"
                    ? "text-[#DC2626]"
                    : data.risk_level === "MEDIUM"
                    ? "text-[#D97706]"
                    : "text-[#1D4ED8]"
                }
              />
            </button>
          )}
          {data.case_number && (
            <MetaItem
              icon={<Hash className="w-4 h-4 text-[#667085]" />}
              label="Esas No"
              value={data.case_number}
            />
          )}
          {data.primary_jurisdiction && (
            <MetaItem
              icon={<MapPin className="w-4 h-4 text-[#667085]" />}
              label="Yetkili Mahkeme"
              value={data.primary_jurisdiction}
            />
          )}
          {/* Risk badge */}
          <div className="ml-auto">
            <span
              className={`
                inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1
                ${riskBadge.bg} ${riskBadge.text}
              `}
              style={{ fontWeight: 600 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {riskBadge.label}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-4">
          <p
            className="text-xs text-[#667085] dark:text-[#94A3B8] mb-1"
            style={{
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Belge Özeti
          </p>
          <p className="text-sm text-[#344054] dark:text-[#CBD5E1]" style={{ lineHeight: 1.7 }}>
            {data.document_summary}
          </p>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <div className="flex rounded-xl bg-[#F2F4F7] dark:bg-[#1E293B] p-1 gap-1 border dark:border-[#334155]">
        <TabButton
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          icon={<Clock className="w-4 h-4" />}
          label="Zaman Çizelgesi"
          count={data.total_events_found}
        />
        <TabButton
          active={activeTab === "contradictions"}
          onClick={() => setActiveTab("contradictions")}
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Çelişki Dedektifi"
          count={data.total_contradictions_found}
          countColor={
            data.risk_level === "HIGH"
              ? "bg-[#DC2626]"
              : data.risk_level === "MEDIUM"
              ? "bg-[#D97706]"
              : data.total_contradictions_found > 0
              ? "bg-[#3B82F6]"
              : undefined
          }
        />
        <TabButton
          active={activeTab === "graph"}
          onClick={() => setActiveTab("graph")}
          icon={<Network className="w-4 h-4" />}
          label="İlişki Haritası"
          count={data.events.length + data.contradictions.length}
        />
        <TabButton
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          icon={<MessageCircle className="w-4 h-4" />}
          label="Dava Asistanı"
          count={data.total_events_found + data.total_contradictions_found}
          countColor="bg-[#7C3AED]"
        />
      </div>

      {/* ── Timeline tab ─────────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <>
          {/* Category filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 text-sm text-[#344054] dark:text-[#CBD5E1]"
              style={{ fontWeight: 500 }}
            >
              <Filter className="w-4 h-4 text-[#667085]" />
              Filtrele:
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    text-xs rounded-full px-3 py-1.5 transition-all border
                    ${selectedCategory === cat
                      ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                      : "bg-white dark:bg-[#334155] text-[#344054] dark:text-[#CBD5E1] border-[#D0D5DD] dark:border-[#475569] hover:border-[#2D6BE4] hover:text-[#2D6BE4]"
                    }
                  `}
                  style={{ fontWeight: 500 }}
                >
                  {cat === ALL_CATEGORIES ? (
                    `Tümü (${data.total_events_found})`
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CategoryBadge category={cat} size="sm" />
                      {data.events.filter((e) => e.category === cat).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filter note */}
          {selectedCategory !== ALL_CATEGORIES && (
            <p className="text-xs text-[#667085] dark:text-[#94A3B8]">
              <strong className="text-[#344054] dark:text-[#CBD5E1]">{filtered.length}</strong> olay
              gösteriliyor &mdash;{" "}
              <button
                onClick={() => setSelectedCategory(ALL_CATEGORIES)}
                className="text-[#2D6BE4] underline hover:no-underline"
              >
                Filtreyi temizle
              </button>
            </p>
          )}

          {/* Event list */}
          <div>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[#667085] dark:text-[#94A3B8] text-sm">
                Bu kategoride olay bulunamadı.
              </div>
            ) : (
              filtered.map((event, i) => {
                const originalIndex = data.events.indexOf(event);
                const flaggedBy = eventContradictionMap.get(originalIndex) ?? [];
                return (
                  <div key={`${event.date}-${originalIndex}`} id={`tl-event-${originalIndex}`}>
                    <TimelineEventCard
                      event={event}
                      index={originalIndex}
                      isLast={i === filtered.length - 1}
                      flaggedBy={flaggedBy}
                      onContradictionClick={handleContradictionClick}
                      highlighted={highlightedEventIdx === originalIndex}
                    />
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Contradiction tab ─────────────────────────────────────────── */}
      {activeTab === "contradictions" && (
        <ContradictionPanel
          contradictions={data.contradictions}
          riskLevel={data.risk_level}
          analysisNotes={data.analysis_notes}
          onEventClick={handleEventClick}
        />
      )}

      {/* ── Graph tab ────────────────────────────────────────────────── */}
      {activeTab === "graph" && (
        <GraphView data={data} />
      )}

      {/* ── Chat / Assistant tab ─────────────────────────────────────── */}
      {activeTab === "chat" && (
        <ChatInterface data={data} onCitationClick={handleCitationClick} />
      )}
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function MetaItem({
  icon,
  label,
  value,
  highlight,
  highlightColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-[#667085] dark:text-[#94A3B8]">{label}:</span>
      <span className={`text-sm ${highlightColor ?? (highlight ? "text-[#1D4ED8] dark:text-[#93C5FD]" : "text-[#101828] dark:text-white")}`}
        style={{ fontWeight: highlight ? 700 : 500 }}
      >
        {value}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  countColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  countColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
        transition-all duration-150 text-sm
        ${active
          ? "bg-white dark:bg-[#334155] shadow-sm text-[#101828] dark:text-white"
          : "text-[#667085] dark:text-[#94A3B8] hover:text-[#344054] dark:hover:text-[#CBD5E1]"
        }
      `}
      style={{ fontWeight: active ? 600 : 500 }}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`
          text-xs rounded-full px-2 py-0.5 min-w-[1.5rem] text-center
          ${active
            ? countColor
              ? `${countColor} text-white`
              : "bg-[#E4E7EC] dark:bg-[#475569] text-[#344054] dark:text-[#CBD5E1]"
            : "bg-[#E4E7EC] dark:bg-[#334155] text-[#667085] dark:text-[#94A3B8]"
          }
        `}
        style={{ fontWeight: 600 }}
      >
        {count}
      </span>
    </button>
  );
}