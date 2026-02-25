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

export interface AnalysisResultData {
  events: TimelineEventData[];
  document_summary: string;
  total_events_found: number;
  primary_jurisdiction?: string | null;
  case_number?: string | null;
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

type TimelineTab = "timeline" | "contradictions" | "graph" | "chat";

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: "bg-severity-high-bg", text: "text-severity-high-text", label: "Yüksek Risk" },
  MEDIUM: { bg: "bg-severity-medium-bg", text: "text-severity-medium-text", label: "Orta Risk" },
  LOW: { bg: "bg-severity-low-bg", text: "text-severity-low-text", label: "Düşük Risk" },
  NONE: { bg: "bg-severity-none-bg", text: "text-severity-none-text", label: "Risk Yok" },
};

const ALL_CATEGORIES = "Tümü";

export function TimelineView({ data, fileName, onReset }: TimelineViewProps) {
  const [activeTab, setActiveTab] = useState<TimelineTab>("timeline");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [highlightedEventIdx, setHighlightedEventIdx] = useState<number | null>(null);

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

  const handleContradictionClick = useCallback(() => {
    setActiveTab("contradictions");
  }, []);

  const handleEventClick = useCallback((_eventId: number) => {
    setActiveTab("timeline");
  }, []);

  const handleCitationClick = useCallback((eventIdx: number) => {
    setSelectedCategory(ALL_CATEGORIES);
    setActiveTab("timeline");
    setHighlightedEventIdx(eventIdx);
  }, []);

  useEffect(() => {
    if (highlightedEventIdx === null) return;
    const scrollTimer = setTimeout(() => {
      document
        .getElementById(`tl-event-${highlightedEventIdx}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    const clearTimer = setTimeout(() => setHighlightedEventIdx(null), 3500);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightedEventIdx]);

  const riskBadge = RISK_BADGE[data.risk_level];

  return (
    <div
      className={`w-full mx-auto space-y-5 ${activeTab === "graph" || activeTab === "chat" ? "max-w-6xl" : "max-w-3xl"}`}
      style={{ transition: "max-width 0.3s ease" }}
    >
      <div className="rounded-2xl border border-border-default bg-surface-card shadow-sm overflow-hidden transition-colors duration-200">
        <div className="bg-gradient-to-r from-accent-primary-strong to-accent-primary px-6 py-5">
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
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm rounded-lg px-4 py-2 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ fontWeight: 500 }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Yeni Belge
            </button>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-4 border-b border-border-subtle">
          <MetaItem icon={<FileSearch className="w-4 h-4 text-text-muted" />} label="Olay" value={String(data.total_events_found)} highlight />

          {data.total_contradictions_found > 0 && (
            <button
              onClick={() => setActiveTab("contradictions")}
              className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-md"
            >
              <MetaItem
                icon={<ShieldAlert className="w-4 h-4 text-text-muted" />}
                label="Çelişki"
                value={String(data.total_contradictions_found)}
                highlight
                highlightColor={
                  data.risk_level === "HIGH"
                    ? "text-severity-high-solid"
                    : data.risk_level === "MEDIUM"
                    ? "text-severity-medium-solid"
                    : "text-severity-low-solid"
                }
              />
            </button>
          )}

          {data.case_number && (
            <MetaItem icon={<Hash className="w-4 h-4 text-text-muted" />} label="Esas No" value={data.case_number} />
          )}
          {data.primary_jurisdiction && (
            <MetaItem
              icon={<MapPin className="w-4 h-4 text-text-muted" />}
              label="Yetkili Mahkeme"
              value={data.primary_jurisdiction}
            />
          )}

          <div className="ml-auto">
            <span className={`inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 ${riskBadge.bg} ${riskBadge.text}`} style={{ fontWeight: 600 }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {riskBadge.label}
            </span>
          </div>
        </div>

        <div className="px-6 py-4">
          <p
            className="text-xs text-text-muted mb-1"
            style={{ fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            Belge Özeti
          </p>
          <p className="text-sm text-text-secondary" style={{ lineHeight: 1.7 }}>
            {data.document_summary}
          </p>
        </div>
      </div>

      <div className="flex rounded-xl bg-surface-muted p-1 gap-1 border border-border-subtle" role="tablist" aria-label="Analiz sekmeleri">
        <TabButton
          active={activeTab === "timeline"}
          tabId="timeline-tab"
          panelId="timeline-panel"
          onClick={() => setActiveTab("timeline")}
          icon={<Clock className="w-4 h-4" />}
          label="Zaman Çizelgesi"
          count={data.total_events_found}
        />
        <TabButton
          active={activeTab === "contradictions"}
          tabId="contradictions-tab"
          panelId="contradictions-panel"
          onClick={() => setActiveTab("contradictions")}
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Çelişki Dedektifi"
          count={data.total_contradictions_found}
          countColor={
            data.risk_level === "HIGH"
              ? "bg-severity-high-solid"
              : data.risk_level === "MEDIUM"
              ? "bg-severity-medium-solid"
              : data.total_contradictions_found > 0
              ? "bg-severity-low-solid"
              : undefined
          }
        />
        <TabButton
          active={activeTab === "graph"}
          tabId="graph-tab"
          panelId="graph-panel"
          onClick={() => setActiveTab("graph")}
          icon={<Network className="w-4 h-4" />}
          label="İlişki Haritası"
          count={data.events.length + data.contradictions.length}
        />
        <TabButton
          active={activeTab === "chat"}
          tabId="chat-tab"
          panelId="chat-panel"
          onClick={() => setActiveTab("chat")}
          icon={<MessageCircle className="w-4 h-4" />}
          label="Dava Asistanı"
          count={data.total_events_found + data.total_contradictions_found}
          countColor="bg-violet-600"
        />
      </div>

      {activeTab === "timeline" && (
        <div id="timeline-panel" role="tabpanel" aria-labelledby="timeline-tab">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary" style={{ fontWeight: 500 }}>
              <Filter className="w-4 h-4 text-text-muted" />
              Filtrele:
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    text-xs rounded-full px-3 py-1.5 transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
                    ${selectedCategory === cat
                      ? "bg-accent-primary-strong text-white border-accent-primary-strong"
                      : "bg-surface-card text-text-secondary border-border-default hover:border-border-accent hover:text-text-accent"
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

          {selectedCategory !== ALL_CATEGORIES && (
            <p className="text-xs text-text-muted mb-4">
              <strong className="text-text-secondary">{filtered.length}</strong> olay gösteriliyor —{" "}
              <button
                onClick={() => setSelectedCategory(ALL_CATEGORIES)}
                className="text-text-accent underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-sm"
              >
                Filtreyi temizle
              </button>
            </p>
          )}

          <div>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-sm">Bu kategoride olay bulunamadı.</div>
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
        </div>
      )}

      {activeTab === "contradictions" && (
        <div id="contradictions-panel" role="tabpanel" aria-labelledby="contradictions-tab">
          <ContradictionPanel
            contradictions={data.contradictions}
            riskLevel={data.risk_level}
            analysisNotes={data.analysis_notes}
            onEventClick={handleEventClick}
          />
        </div>
      )}

      {activeTab === "graph" && (
        <div id="graph-panel" role="tabpanel" aria-labelledby="graph-tab">
          <GraphView data={data} />
        </div>
      )}

      {activeTab === "chat" && (
        <div id="chat-panel" role="tabpanel" aria-labelledby="chat-tab">
          <ChatInterface data={data} onCitationClick={handleCitationClick} />
        </div>
      )}
    </div>
  );
}

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
      <span className="text-xs text-text-muted">{label}:</span>
      <span className={`text-sm ${highlightColor ?? (highlight ? "text-text-accent" : "text-text-primary")}`} style={{ fontWeight: highlight ? 700 : 500 }}>
        {value}
      </span>
    </div>
  );
}

function TabButton({
  active,
  tabId,
  panelId,
  onClick,
  icon,
  label,
  count,
  countColor,
}: {
  active: boolean;
  tabId: string;
  panelId: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  countColor?: string;
}) {
  return (
    <button
      id={tabId}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
        transition-all duration-150 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
        ${active ? "bg-surface-card shadow-sm text-text-primary" : "text-text-muted hover:text-text-secondary"}
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
              : "bg-surface-muted text-text-secondary"
            : "bg-surface-muted text-text-muted"
          }
        `}
        style={{ fontWeight: 600 }}
      >
        {count}
      </span>
    </button>
  );
}
