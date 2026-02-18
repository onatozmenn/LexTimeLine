/**
 * graphLayout.ts
 *
 * Wraps Dagre's hierarchical layout algorithm for use with @xyflow/react.
 * Given a flat list of React Flow nodes and edges, returns new nodes
 * whose `position` fields are computed by Dagre so that nothing overlaps.
 *
 * Node dimensions here MUST match the sizes rendered by the custom
 * EventNode / EntityNode components in GraphView.tsx.
 */

import * as dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

// ── Fixed node dimensions (px) ───────────────────────────────────────────────
// These are the visual sizes of the rendered custom nodes.
export const NODE_DIMS = {
  eventNode:  { w: 284, h: 134 },
  entityNode: { w: 172, h: 68  },
  default:    { w: 180, h: 80  },
} as const;

export type LayoutDirection = "TB" | "LR";

/**
 * Runs Dagre's rank-based layout on `nodes` and `edges`.
 *
 * @param nodes     React Flow nodes (positions are ignored and overwritten).
 * @param edges     React Flow edges (untouched; returned as-is).
 * @param direction "TB" (top → bottom) or "LR" (left → right).
 * @returns New node array with correct `position` values + original edges.
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = "TB",
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Dagre uses a multigraph to allow parallel edges between the same pair.
  const g = new dagre.graphlib.Graph({ multigraph: true, compound: false });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir:  direction,
    // Looser spacing in LR so entity labels don't collide.
    nodesep:  direction === "TB" ? 70  : 50,
    ranksep:  direction === "TB" ? 130 : 220,
    edgesep:  40,
    marginx:  60,
    marginy:  60,
    // "UL" (upper-left) keeps entities to the left in LR mode.
    align:    "UL",
  });

  // Register every node with its fixed dimensions.
  nodes.forEach((node) => {
    const type = node.type ?? "default";
    const dims = NODE_DIMS[type as keyof typeof NODE_DIMS] ?? NODE_DIMS.default;
    g.setNode(node.id, { width: dims.w, height: dims.h });
  });

  // Register every edge.  Use edge.id as the multigraph edge name so
  // parallel contradiction edges don't collapse into one.
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target, {}, edge.id);
  });

  dagre.layout(g);

  // Map Dagre's center-point output → React Flow's top-left convention.
  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    const type = node.type ?? "default";
    const dims = NODE_DIMS[type as keyof typeof NODE_DIMS] ?? NODE_DIMS.default;

    return {
      ...node,
      position: {
        x: dagreNode.x - dims.w / 2,
        y: dagreNode.y - dims.h / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
