/**
 * GraphView.tsx — "The Investigation Board"
 *
 * Converts an AnalysisResult (timeline + contradictions) into an interactive
 * node-graph using @xyflow/react and Dagre auto-layout.
 *
 * Node types:
 *   • EventNode   — Rounded rectangle, colour-coded by contradiction severity.
 *   • EntityNode  — Pill / capsule, colour-coded by entity type (person / org / court).
 *
 * Edge types:
 *   • Entity → Event     : Light grey "Katıldı" (Participated) edges.
 *   • Event  → Event     : Thin blue sequential / chronological edges (toggle).
 *   • Contradiction       : Coloured dashed edges; HIGH severity are animated.
 *
 * Interactions:
 *   • Click any node → slide-in detail panel on the right.
 *   • Toolbar controls: layout direction, entity / sequential-edge toggles,
 *     min-appearance filter, fit-view.
 *   • Built-in Controls, MiniMap, and a floating Legend panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  CalendarDays,
  User,
  Building2,
  Scale as ScaleIcon,
  X,
  ZoomIn,
  AlertTriangle,
  Lightbulb,
  Users,
  GitMerge,
  ArrowUpDown,
  ArrowLeftRight,
  BookOpen,
  Layers,
  FileText,
} from "lucide-react";

import { getLayoutedElements, type LayoutDirection } from "../utils/graphLayout";
import type { AnalysisResultData } from "./TimelineView";
import type { ContradictionData } from "./ContradictionCard";
import type { TimelineEventData } from "./TimelineEventCard";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EntityKind = "person" | "organization" | "court";

interface EventNodeData extends Record<string, unknown> {
  event: TimelineEventData;
  index: number;
  contradictions: ContradictionData[];
  layoutDir: LayoutDirection;
}

interface EntityNodeData extends Record<string, unknown> {
  name: string;
  eventIndices: number[];
  kind: EntityKind;
  layoutDir: LayoutDirection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour palettes
// ─────────────────────────────────────────────────────────────────────────────

const SEV_PALETTE = {
  HIGH: {
    bg: "var(--color-severity-high-bg)",
    border: "var(--color-severity-high-border)",
    text: "var(--color-severity-high-text)",
    badge: "var(--color-severity-high-solid)",
    muted: "var(--color-severity-high-border)",
  },
  MEDIUM: {
    bg: "var(--color-severity-medium-bg)",
    border: "var(--color-severity-medium-border)",
    text: "var(--color-severity-medium-text)",
    badge: "var(--color-severity-medium-solid)",
    muted: "var(--color-severity-medium-border)",
  },
  LOW: {
    bg: "var(--color-severity-low-bg)",
    border: "var(--color-severity-low-border)",
    text: "var(--color-severity-low-text)",
    badge: "var(--color-severity-low-solid)",
    muted: "var(--color-severity-low-border)",
  },
  NONE: {
    bg: "var(--color-surface-card)",
    border: "var(--color-border-default)",
    text: "var(--color-text-primary)",
    badge: "var(--color-text-muted)",
    muted: "var(--color-border-subtle)",
  },
} as const;

const KIND_PALETTE: Record<EntityKind, { bg: string; border: string; text: string; muted: string; dimBg: string }> = {
  court: {
    bg: "var(--color-surface-info)",
    border: "var(--color-text-accent)",
    text: "var(--color-text-accent)",
    muted: "var(--color-accent-primary-subtle)",
    dimBg: "var(--color-surface-soft)",
  },
  organization: {
    bg: "var(--color-surface-success)",
    border: "var(--color-severity-none-solid)",
    text: "var(--color-text-success)",
    muted: "var(--color-text-success)",
    dimBg: "var(--color-severity-none-bg)",
  },
  person: {
    bg: "var(--color-severity-low-bg)",
    border: "var(--color-severity-low-solid)",
    text: "var(--color-text-accent)",
    muted: "var(--color-accent-primary-subtle)",
    dimBg: "var(--color-surface-soft)",
  },
};

const GRAPH_COLORS = {
  accentStrong: "var(--color-accent-primary-strong)",
  accent: "var(--color-accent-primary)",
  accentSubtle: "var(--color-accent-primary-subtle)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  textSubtle: "var(--color-text-subtle)",
  surfaceCard: "var(--color-surface-card)",
  surfacePage: "var(--color-surface-page)",
  surfaceMuted: "var(--color-surface-muted)",
  surfaceWarning: "var(--color-severity-medium-bg)",
  borderSubtle: "var(--color-border-subtle)",
  borderDefault: "var(--color-border-default)",
  borderAccent: "var(--color-border-accent)",
  graphBg: "var(--color-graph-bg)",
  graphToolbarBg: "var(--color-graph-toolbar-bg)",
  graphToolbarBorder: "var(--color-graph-toolbar-border)",
  graphPanelBg: "var(--color-graph-panel-bg)",
  graphPanelBorder: "var(--color-graph-panel-border)",
  graphGrid: "var(--color-graph-grid)",
  graphLegendBg: "var(--color-graph-legend-bg)",
  graphLegendText: "var(--color-graph-legend-text)",
  graphEdgeSeq: "var(--color-graph-edge-seq)",
  graphEdgeEntity: "var(--color-graph-edge-entity)",
  graphHintBg: "var(--color-graph-hint-bg)",
  graphHintBorder: "var(--color-graph-hint-border)",
  graphHintText: "var(--color-graph-hint-text)",
  inverse: "var(--color-text-inverse)",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function detectKind(name: string): EntityKind {
  const l = name.toLowerCase();
  if (
    l.includes("mahkeme") || l.includes("daire") || l.includes("yargıtay") ||
    l.includes("anayasa") || l.includes("savcılık") || l.includes("cumhuriyet") ||
    l.includes("bölge adliye")
  ) return "court";
  if (
    l.includes("a.ş") || l.includes("ltd") || l.includes("şirketi") ||
    l.includes("müdürlüğü") || l.includes("noter") || l.includes("icra") ||
    l.includes("heyet") || l.includes("kurul") || l.includes("bilirkişi") ||
    l.includes("banka") || l.includes("vakıf")
  ) return "organization";
  return "person";
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom EventNode
// ─────────────────────────────────────────────────────────────────────────────

function EventNodeComponent({ data, selected }: NodeProps) {
  const d = data as EventNodeData;
  const topSev = (d.contradictions[0]?.severity ?? "NONE") as keyof typeof SEV_PALETTE;
  const pal = SEV_PALETTE[topSev];
  const isLR = d.layoutDir === "LR";

  return (
    <>
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        style={{ width: 9, height: 9, background: pal.border, border: `2px solid ${GRAPH_COLORS.surfaceCard}` }}
      />

      <div
        style={{
          width: 284,
          background: pal.bg,
          border: `2px solid ${selected ? GRAPH_COLORS.borderAccent : pal.border}`,
          borderRadius: 12,
          padding: "10px 13px 11px",
          boxShadow: selected
            ? "0 0 0 3px color-mix(in oklab, var(--color-border-accent) 32%, transparent), 0 6px 18px rgba(0,0,0,0.14)"
            : "0 2px 8px rgba(0,0,0,0.07)",
          cursor: "pointer",
          transition: "box-shadow 0.18s, border-color 0.18s",
          userSelect: "none",
        }}
      >
        {/* Top row: date + index + contradiction badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CalendarDays style={{ width: 11, height: 11, color: GRAPH_COLORS.textMuted, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: GRAPH_COLORS.textMuted, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.02em" }}>
              {d.event.date}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, background: GRAPH_COLORS.accentStrong, color: GRAPH_COLORS.inverse,
              borderRadius: 100, padding: "1px 7px",
            }}>
              #{d.index + 1}
            </span>
            {d.contradictions.length > 0 && (
              <span style={{
                fontSize: 9, fontWeight: 700, background: pal.badge, color: GRAPH_COLORS.inverse,
                borderRadius: 100, padding: "1px 7px",
                display: "flex", alignItems: "center", gap: 3,
              }}>
                <AlertTriangle style={{ width: 8, height: 8 }} />
                {d.contradictions.length}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 11, color: pal.text, lineHeight: 1.55, margin: "0 0 8px",
          fontWeight: 500,
        }}>
          {truncate(d.event.description, 95)}
        </p>

        {/* Category pill */}
        <span style={{
          fontSize: 9,
          background: "color-mix(in oklab, var(--color-surface-muted) 70%, transparent)",
          color: pal.text,
          borderRadius: 100, padding: "2px 9px", fontWeight: 600, display: "inline-block",
        }}>
          {d.event.category}
        </span>
      </div>

      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        style={{ width: 9, height: 9, background: pal.border, border: `2px solid ${GRAPH_COLORS.surfaceCard}` }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom EntityNode
// ─────────────────────────────────────────────────────────────────────────────

function EntityNodeComponent({ data, selected }: NodeProps) {
  const d = data as EntityNodeData;
  const pal = KIND_PALETTE[d.kind];
  const isLR = d.layoutDir === "LR";

  const KindIcon = d.kind === "court"
    ? ScaleIcon
    : d.kind === "organization"
    ? Building2
    : User;

  return (
    <>
      <Handle
        type="target"
        position={isLR ? Position.Left : Position.Top}
        style={{ width: 7, height: 7, background: pal.border, border: `2px solid ${GRAPH_COLORS.surfaceCard}`, opacity: 0.8 }}
      />

      <div
        style={{
          width: 172,
          background: selected ? pal.dimBg : pal.bg,
          border: `2px solid ${selected ? GRAPH_COLORS.borderAccent : pal.border}`,
          borderRadius: 40,
          padding: "9px 16px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          boxShadow: selected
            ? "0 0 0 3px color-mix(in oklab, var(--color-border-accent) 30%, transparent), 0 4px 10px rgba(0,0,0,0.1)"
            : "0 1px 4px rgba(0,0,0,0.07)",
          cursor: "pointer",
          transition: "box-shadow 0.18s, border-color 0.18s",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <KindIcon style={{ width: 11, height: 11, color: pal.muted, flexShrink: 0 }} />
          <span style={{
            fontSize: 11, color: pal.text, fontWeight: 700,
            maxWidth: 118, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {d.name}
          </span>
        </div>
        <span style={{ fontSize: 9, color: pal.muted, letterSpacing: "0.02em" }}>
          {d.eventIndices.length} olay ·{" "}
          {d.kind === "court" ? "Mahkeme" : d.kind === "organization" ? "Kuruluş" : "Kişi"}
        </span>
      </div>

      <Handle
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        style={{ width: 7, height: 7, background: pal.border, border: `2px solid ${GRAPH_COLORS.surfaceCard}`, opacity: 0.8 }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// nodeTypes — MUST be defined at module level to prevent re-renders
// ─────────────────────────────────────────────────────────────────────────────

const nodeTypes = {
  eventNode:  EventNodeComponent,
  entityNode: EntityNodeComponent,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Graph data builder
// ─────────────────────────────────────────────────────────────────────────────

function buildGraphData(
  data: AnalysisResultData,
  layoutDir: LayoutDirection,
  showEntities: boolean,
  showSeqEdges: boolean,
  minAppearances: number,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const severityEdgeColor: Record<ContradictionData["severity"], string> = {
    HIGH: "var(--color-severity-high-solid)",
    MEDIUM: "var(--color-severity-medium-solid)",
    LOW: "var(--color-severity-low-solid)",
  };

  // Map: event index → contradictions referencing it
  const contraByEvent = new Map<number, ContradictionData[]>();
  data.contradictions.forEach((c) => {
    c.involved_event_ids.forEach((id) => {
      if (!contraByEvent.has(id)) contraByEvent.set(id, []);
      contraByEvent.get(id)!.push(c);
    });
  });

  // ── Event nodes ──────────────────────────────────────────────────────────
  data.events.forEach((event, index) => {
    nodes.push({
      id: `event-${index}`,
      type: "eventNode",
      position: { x: 0, y: 0 },
      data: {
        event,
        index,
        contradictions: contraByEvent.get(index) ?? [],
        layoutDir,
      } as EventNodeData,
    });
  });

  // ── Sequential event → event edges ──────────────────────────────────────
  if (showSeqEdges) {
    data.events.forEach((_, i) => {
      if (i < data.events.length - 1) {
        edges.push({
          id: `seq-${i}-${i + 1}`,
          source: `event-${i}`,
          target: `event-${i + 1}`,
          type: "smoothstep",
          style: { stroke: GRAPH_COLORS.graphEdgeSeq, strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: GRAPH_COLORS.graphEdgeSeq, width: 14, height: 14 },
          label: "sonraki",
          labelStyle: { fontSize: 9, fill: GRAPH_COLORS.graphEdgeSeq, fontWeight: 600 },
          labelBgStyle: { fill: GRAPH_COLORS.surfaceCard, opacity: 0.85 },
          labelBgPadding: [3, 7] as [number, number],
          labelBgBorderRadius: 4,
        });
      }
    });
  }

  // ── Contradiction edges ──────────────────────────────────────────────────
  data.contradictions.forEach((c, cIdx) => {
    const ids = c.involved_event_ids;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const stroke = severityEdgeColor[c.severity];
        const sw = c.severity === "HIGH" ? 2.5 : 2;
        const label = `⚠ ${truncate(c.title, 30)}`;

        edges.push({
          id: `contra-${cIdx}-${ids[i]}-${ids[j]}`,
          source: `event-${ids[i]}`,
          target: `event-${ids[j]}`,
          type: "default",
          animated: c.severity === "HIGH",
          style: { stroke, strokeWidth: sw, strokeDasharray: "9 5" },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
          label,
          labelStyle: { fontSize: 9, fill: stroke, fontWeight: 700 },
          labelBgStyle: { fill: GRAPH_COLORS.surfaceCard, opacity: 0.93 },
          labelBgPadding: [4, 9] as [number, number],
          labelBgBorderRadius: 5,
        });
      }
    }
  });

  // ── Entity nodes + entity→event edges ───────────────────────────────────
  if (showEntities) {
    const entityMap = new Map<string, number[]>();
    data.events.forEach((event, idx) => {
      event.entities.forEach((name) => {
        if (!entityMap.has(name)) entityMap.set(name, []);
        entityMap.get(name)!.push(idx);
      });
    });

    entityMap.forEach((eventIndices, name) => {
      if (eventIndices.length < minAppearances) return;

      const safeId = `entity-${name.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "_")}`;
      const kind = detectKind(name);

      nodes.push({
        id: safeId,
        type: "entityNode",
        position: { x: 0, y: 0 },
        data: { name, eventIndices, kind, layoutDir } as EntityNodeData,
      });

      // Unique event set (one edge per event even if entity appears multiple times)
      [...new Set(eventIndices)].forEach((eventIdx) => {
        edges.push({
          id: `ent-${safeId}-evt-${eventIdx}`,
          source: safeId,
          target: `event-${eventIdx}`,
          type: "smoothstep",
          style: { stroke: GRAPH_COLORS.graphEdgeEntity, strokeWidth: 1.2 },
          markerEnd: { type: MarkerType.Arrow, color: GRAPH_COLORS.graphEdgeEntity, width: 10, height: 10 },
          label: "katıldı",
          labelStyle: { fontSize: 8, fill: GRAPH_COLORS.textMuted, fontWeight: 600 },
          labelBgStyle: { fill: GRAPH_COLORS.surfaceCard, opacity: 0.7 },
          labelBgPadding: [2, 5] as [number, number],
          labelBgBorderRadius: 3,
        });
      });
    });
  }

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeDetailPanel
// ─────────────────────────────────────────────────────────────────────────────

function NodeDetailPanel({
  node,
  data,
  onClose,
}: {
  node: Node;
  data: AnalysisResultData;
  onClose: () => void;
}) {
  if (node.type === "eventNode") {
    const d = node.data as EventNodeData;
    const topSev = (d.contradictions[0]?.severity ?? "NONE") as keyof typeof SEV_PALETTE;
    const pal = SEV_PALETTE[topSev];

    return (
      <div className="flex flex-col h-full bg-surface-card overflow-hidden">
        {/* Header */}
        <div style={{ background: `${pal.border}18`, borderBottom: `3px solid ${pal.border}`, padding: "14px 16px", flexShrink: 0 }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: GRAPH_COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                Olay #{d.index + 1} — {d.event.category}
              </p>
              <p style={{ fontSize: 11, fontFamily: "monospace", color: pal.border, fontWeight: 800 }}>
                {d.event.date}
              </p>
              {d.contradictions.length > 0 && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6,
                  background: pal.badge, borderRadius: 100, padding: "2px 9px",
                }}>
                  <AlertTriangle style={{ width: 9, height: 9, color: "white" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "white" }}>
                    {d.contradictions.length} çelişki
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-text-subtle hover:text-text-secondary transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              aria-label="Detay panelini kapat"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Description */}
          <Section label="Açıklama" icon={<FileText className="w-3.5 h-3.5" />}>
            <p style={{ fontSize: 12, color: GRAPH_COLORS.textSecondary, lineHeight: 1.75 }}>
              {d.event.description}
            </p>
          </Section>

          {/* Entities */}
          {d.event.entities.length > 0 && (
            <Section label="İlgili Taraflar" icon={<Users className="w-3.5 h-3.5" />}>
              <div className="flex flex-wrap gap-1.5">
                {d.event.entities.map((e, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-surface-page border border-border-subtle rounded-full px-2.5 py-[3px] text-text-secondary"
                    style={{ fontWeight: 500 }}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Significance */}
          {d.event.significance && (
            <div
              style={{ borderRadius: 10, padding: "11px 13px" }}
              className="bg-severity-medium-bg border border-severity-medium-border"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <Lightbulb style={{ width: 13, height: 13, color: "var(--color-severity-medium-solid)" }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-severity-medium-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Hukuki Önem
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--color-severity-medium-text)", lineHeight: 1.7, margin: 0 }}>
                {d.event.significance}
              </p>
            </div>
          )}

          {/* Contradictions */}
          {d.contradictions.length > 0 && (
            <Section
              label={`Çelişkiler (${d.contradictions.length})`}
              icon={<AlertTriangle className="w-3.5 h-3.5 text-severity-high-solid" />}
            >
              <div className="space-y-2.5">
                {d.contradictions.map((c, i) => {
                  const cp = SEV_PALETTE[c.severity as keyof typeof SEV_PALETTE];
                  return (
                    <div
                      key={i}
                      style={{
                        background: cp.bg, border: `1px solid ${cp.muted}`,
                        borderLeft: `3px solid ${cp.badge}`,
                        borderRadius: 8, padding: "10px 11px",
                      }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 700, color: cp.badge, marginBottom: 4 }}>
                        {c.title}
                      </p>
                      <p style={{ fontSize: 10, color: cp.text, lineHeight: 1.65, margin: 0 }}>
                        {truncate(c.description, 200)}
                      </p>
                      {c.legal_basis && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 7 }}>
                          <BookOpen style={{ width: 10, height: 10, color: "var(--color-text-accent)" }} />
                          <span style={{ fontSize: 9, color: "var(--color-text-accent)", fontWeight: 600 }}>
                            {c.legal_basis}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </div>
    );
  }

  if (node.type === "entityNode") {
    const d = node.data as EntityNodeData;
    const pal = KIND_PALETTE[d.kind];
    const KindIcon = d.kind === "court" ? ScaleIcon : d.kind === "organization" ? Building2 : User;

    return (
      <div className="flex flex-col h-full bg-surface-card overflow-hidden">
        {/* Header */}
        <div style={{ background: pal.dimBg, borderBottom: `3px solid ${pal.border}`, padding: "14px 16px", flexShrink: 0 }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: pal.border, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <KindIcon style={{ width: 17, height: 17, color: GRAPH_COLORS.inverse }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: pal.text, marginBottom: 2 }}>
                  {d.name}
                </p>
                <p style={{ fontSize: 9, color: pal.muted }}>
                  {d.kind === "court" ? "Mahkeme / Kurum" : d.kind === "organization" ? "Kuruluş" : "Kişi"} — {d.eventIndices.length} olayda
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-subtle hover:text-text-secondary transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              aria-label="Detay panelini kapat"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto p-4">
          <Section label={`Yer Aldığı Olaylar (${d.eventIndices.length})`} icon={<Layers className="w-3.5 h-3.5" />}>
            <div className="space-y-2">
              {[...new Set(d.eventIndices)].map((idx) => {
                const event = data.events[idx];
                if (!event) return null;
                return (
                  <div
                    key={idx}
                    className="bg-surface-page border border-border-subtle rounded-[9px] px-3 py-2.5"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontFamily: "monospace", color: GRAPH_COLORS.textMuted, fontWeight: 700 }}>
                        {event.date}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, background: GRAPH_COLORS.accentStrong, color: GRAPH_COLORS.inverse,
                        borderRadius: 100, padding: "1px 7px",
                      }}>
                        #{idx + 1}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: GRAPH_COLORS.textSecondary, lineHeight: 1.55, margin: 0 }}>
                      {truncate(event.description, 110)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    );
  }

  return null;
}

// Small shared section header helper
function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span className="text-text-muted">{icon}</span>
        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.07em]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small toggle switch used in the toolbar
// ─────────────────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0,
        width: "100%",
      }}
    >
      <span className="text-[10px] text-text-secondary" style={{ fontWeight: 500 }}>
        {label}
      </span>
      <div
        className={`w-[30px] h-4 rounded-full relative shrink-0 transition-colors ${
          value ? "bg-accent-primary-strong dark:bg-accent-primary" : "bg-border-default dark:bg-border-subtle"
        }`}
      >
        <div style={{
          width: 12, height: 12, borderRadius: "50%", background: GRAPH_COLORS.inverse,
          position: "absolute", top: 2,
          left: value ? 16 : 2, transition: "left 0.2s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GraphView component
// ─────────────────────────────────────────────────────────────────────────────

interface GraphViewProps {
  data: AnalysisResultData;
}

export function GraphView({ data }: GraphViewProps) {
  const [layoutDir, setLayoutDir]         = useState<LayoutDirection>("TB");
  const [showEntities, setShowEntities]   = useState(true);
  const [showSeqEdges, setShowSeqEdges]   = useState(false);
  const [minApps, setMinApps]             = useState(2);
  const [selectedNode, setSelectedNode]   = useState<Node | null>(null);
  const rfRef = useRef<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Rebuild + re-layout whenever any control changes
  useEffect(() => {
    const { nodes: raw, edges: rawE } = buildGraphData(
      data, layoutDir, showEntities, showSeqEdges, minApps
    );
    const { nodes: laid, edges: laidE } = getLayoutedElements(raw, rawE, layoutDir);
    setNodes(laid);
    setEdges(laidE);
    // Clear selection when graph changes
    setSelectedNode(null);
  }, [data, layoutDir, showEntities, showSeqEdges, minApps]);

  // Fit view 150 ms after nodes settle
  useEffect(() => {
    const t = setTimeout(() => {
      rfRef.current?.fitView({ padding: 0.14, duration: 420 });
    }, 150);
    return () => clearTimeout(t);
  }, [nodes.length, edges.length, layoutDir]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfRef.current = instance;
    setTimeout(() => instance.fitView({ padding: 0.14, duration: 300 }), 80);
  }, []);

  // Stats
  const stats = useMemo(() => ({
    events:    nodes.filter((n) => n.type === "eventNode").length,
    entities:  nodes.filter((n) => n.type === "entityNode").length,
    contras:   edges.filter((e) => e.id.startsWith("contra-")).length,
  }), [nodes, edges]);

  const [isDarkMode, setIsDarkMode] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const graphHeight = "clamp(420px, 68vh, 760px)";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-graph-panel-border bg-graph-bg">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-5 py-3 bg-graph-toolbar-bg border-b border-graph-toolbar-border flex-wrap">
        {/* Title */}
        <div className="flex items-center gap-2 mr-2">
          <GitMerge className="w-4 h-4 text-text-accent" />
          <span className="text-[13px] font-bold text-text-primary">
            İlişki Haritası
          </span>
        </div>

        {/* Stats pills */}
        <div className="flex gap-2">
          {[
            { label: "Olay", value: stats.events, color: "var(--color-text-accent)", bg: "var(--color-surface-soft)" },
            { label: "Varlık", value: stats.entities, color: "var(--color-text-success)", bg: "var(--color-surface-success)" },
            { label: "Çelişki", value: stats.contras, color: "var(--color-severity-high-solid)", bg: "var(--color-severity-high-bg)" },
          ].map((s) => (
            <span
              key={s.label}
              style={{
                fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "3px 10px",
                background: s.bg, color: s.color, display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span style={{ fontSize: 13 }}>{s.value}</span>
              <span style={{ fontWeight: 500, opacity: 0.75 }}>{s.label}</span>
            </span>
          ))}
        </div>

        <div style={{ height: 20, width: 1, background: GRAPH_COLORS.graphToolbarBorder, flexShrink: 0 }} />

        {/* Layout toggle */}
        <div className="flex gap-1.5 items-center">
          <span style={{ fontSize: 10, color: GRAPH_COLORS.textMuted, fontWeight: 600 }}>Düzen:</span>
          {(["TB", "LR"] as LayoutDirection[]).map((dir) => (
            <button
              key={dir}
              onClick={() => setLayoutDir(dir)}
              aria-pressed={layoutDir === dir}
              style={{
                padding: "4px 10px", fontSize: 10, fontWeight: 600,
                borderRadius: 6, cursor: "pointer",
                border: `1px solid ${layoutDir === dir ? GRAPH_COLORS.borderAccent : GRAPH_COLORS.graphToolbarBorder}`,
                background: layoutDir === dir ? GRAPH_COLORS.accentStrong : GRAPH_COLORS.graphPanelBg,
                color: layoutDir === dir ? GRAPH_COLORS.inverse : GRAPH_COLORS.textMuted,
                display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
              }}
            >
              {dir === "TB"
                ? <><ArrowUpDown style={{ width: 10, height: 10 }} /> Dikey</>
                : <><ArrowLeftRight style={{ width: 10, height: 10 }} /> Yatay</>
              }
            </button>
          ))}
        </div>

        <div style={{ height: 20, width: 1, background: GRAPH_COLORS.graphToolbarBorder, flexShrink: 0 }} />

        {/* Toggles */}
        <div className="flex gap-4 items-center">
          <ToggleRow label="Varlıklar" value={showEntities} onChange={setShowEntities} />
          <ToggleRow label="Kronoloji" value={showSeqEdges} onChange={setShowSeqEdges} />
        </div>

        {/* Min appearances */}
        {showEntities && (
          <div className="flex items-center gap-2 ml-1">
            <span style={{ fontSize: 10, color: GRAPH_COLORS.textMuted, fontWeight: 600, whiteSpace: "nowrap" }}>
              Min. {minApps}+ olay:
            </span>
            <input
              type="range" min={1} max={5} value={minApps}
              onChange={(e) => setMinApps(Number(e.target.value))}
              style={{ width: 64, accentColor: "var(--color-accent-primary)", cursor: "pointer" }}
              aria-label="Minimum görünme sayısı"
            />
          </div>
        )}

        {/* Fit view */}
        <button
          onClick={() => rfRef.current?.fitView({ padding: 0.14, duration: 420 })}
          className="ml-auto px-3 py-[5px] text-[10px] font-semibold rounded-[7px] border border-graph-panel-border bg-graph-panel-bg text-text-secondary hover:bg-surface-muted transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label="Grafiğin tamamını göster"
        >
          <ZoomIn style={{ width: 11, height: 11 }} />
          Tümünü Göster
        </button>
      </div>

      {/* ── Canvas + Detail panel ─────────────────────────────────────── */}
      <div style={{ display: "flex", height: graphHeight }}>
        {/* React Flow canvas */}
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={onInit}
            key={`graph-${isDarkMode ? "dark" : "light"}`}
            fitView
            fitViewOptions={{ padding: 0.14 }}
            minZoom={0.15}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ zIndex: 1 }}
          >
            {/* Dot-grid background */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.2}
              color={GRAPH_COLORS.graphGrid}
            />

            {/* Zoom / pan controls */}
            <Controls
              style={{ bottom: 20, left: 20 }}
              showInteractive={false}
            />

            {/* Minimap — shifts left when detail panel is open */}
            <MiniMap
              style={{
                bottom: 20,
                right: selectedNode ? 360 : 20,
                transition: "right 0.26s ease",
                background: GRAPH_COLORS.graphPanelBg,
                borderRadius: 8,
                border: `1px solid ${GRAPH_COLORS.graphPanelBorder}`,
              }}
              nodeColor={(n) => {
                if (n.type === "eventNode") {
                  const d = n.data as EventNodeData;
                  const sev = d.contradictions[0]?.severity;
                  return sev === "HIGH"
                    ? "var(--color-severity-high-solid)"
                    : sev === "MEDIUM"
                    ? "var(--color-severity-medium-solid)"
                    : sev === "LOW"
                    ? "var(--color-severity-low-solid)"
                    : "var(--color-accent-primary-strong)";
                }
                if (n.type === "entityNode") {
                  return KIND_PALETTE[(n.data as EntityNodeData).kind].border;
                }
                return GRAPH_COLORS.textMuted;
              }}
              nodeStrokeWidth={2}
            />

            {/* Legend */}
            <Panel position="bottom-left" style={{ bottom: 80, left: 20 }}>
              <div style={{
                background: GRAPH_COLORS.graphLegendBg, borderRadius: 10, border: `1px solid ${GRAPH_COLORS.graphPanelBorder}`,
                padding: "10px 13px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <p style={{ fontSize: 8, fontWeight: 700, color: GRAPH_COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>
                  Açıklama
                </p>
                {/* Edge types */}
                {[
                  { stroke: "var(--color-severity-high-solid)", dash: true, label: "Yüksek Çelişki (animasyonlu)" },
                  { stroke: "var(--color-severity-medium-solid)", dash: true, label: "Orta Çelişki" },
                  { stroke: "var(--color-severity-low-solid)", dash: true, label: "Düşük Çelişki" },
                  { stroke: "var(--color-graph-edge-seq)", dash: false, label: "Kronolojik Sıra" },
                  { stroke: "var(--color-graph-edge-entity)", dash: false, label: "Katılım (Varlık → Olay)" },
                ].map(({ stroke, dash, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <svg width={22} height={6} style={{ flexShrink: 0 }}>
                      <line x1={0} y1={3} x2={22} y2={3} stroke={stroke} strokeWidth={1.5}
                        strokeDasharray={dash ? "5 3" : undefined} />
                    </svg>
                    <span style={{ fontSize: 9, color: GRAPH_COLORS.graphLegendText }}>{label}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: GRAPH_COLORS.graphPanelBorder, margin: "6px 0" }} />
                {/* Node types */}
                {[
                  { bg: "var(--color-severity-high-bg)", border: "var(--color-severity-high-solid)", label: "Olay — Yüksek Önem" },
                  { bg: "var(--color-severity-medium-bg)", border: "var(--color-severity-medium-solid)", label: "Olay — Orta Önem" },
                  { bg: "var(--color-surface-success)", border: "var(--color-severity-none-solid)", label: "Varlık — Kuruluş" },
                  { bg: "var(--color-severity-low-bg)", border: "var(--color-severity-low-solid)", label: "Varlık — Kişi" },
                  { bg: "var(--color-surface-info)", border: "var(--color-text-accent)", label: "Varlık — Mahkeme" },
                ].map(({ bg, border, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 12, height: 8, borderRadius: 2, border: `1.5px solid ${border}`, background: bg, flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color: GRAPH_COLORS.graphLegendText }}>{label}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* ── Slide-in detail panel ─────────────────────────────────── */}
        <div
          style={{
            width: selectedNode ? 340 : 0,
            overflow: "hidden",
            transition: "width 0.26s cubic-bezier(0.4,0,0.2,1)",
            borderLeft: selectedNode ? `1px solid ${GRAPH_COLORS.graphPanelBorder}` : "none",
            background: GRAPH_COLORS.graphPanelBg,
            flexShrink: 0,
            height: graphHeight,
          }}
        >
          {selectedNode && (
            <NodeDetailPanel
              node={selectedNode}
              data={data}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      </div>

      {/* ── Instruction hint bar ──────────────────────────────────────── */}
      <div className="px-5 py-2.5 bg-graph-hint-bg border-t border-graph-hint-border flex items-center gap-4 flex-wrap">
        <span className="text-[10px] text-graph-hint-text">
          💡 Bir düğüme tıklayarak ayrıntılarını görüntüleyin.
          Kırmızı kesik çizgiler = tespit edilen çelişkiler.
          Araç çubuğundan görünümü özelleştirin.
        </span>
      </div>
    </div>
  );
}
