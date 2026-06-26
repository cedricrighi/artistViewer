import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import type { ArtistGraph } from "../api";

interface Props {
  graph: ArtistGraph;
  /** "concentric" suits an ego graph (center in the middle); "cose" a global graph. */
  layout?: "concentric" | "cose";
  /** Node ids to emphasize (e.g. the artists along a shortest path). */
  highlight?: string[];
  onNodeClick?: (id: string) => void;
  height?: number;
  /** Current UI theme — forces a re-init so graph colors track light/dark. */
  theme?: string;
}

// Interactive graph (zoom / pan / drag) backed by Cytoscape. Replaces the old
// fixed SVG ego graph, which became unreadable past ~12 neighbours.
export default function GraphView({
  graph,
  layout = "cose",
  highlight,
  onNodeClick,
  height = 480,
  theme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest click handler without forcing a full re-init of Cytoscape.
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Read theme-driven colors from CSS variables so the graph matches the UI.
    const cssVars = getComputedStyle(container);
    const v = (name: string, fallback: string) => cssVars.getPropertyValue(name).trim() || fallback;
    const nodeColor = v("--graph-node", "#a78bfa");
    const edgeColor = v("--graph-edge", "#d7d7e0");
    const labelColor = v("--graph-label", "#27272a");
    const labelBg = v("--graph-label-bg", "#ffffff");
    const accent = v("--accent", "#6d28d9");

    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const highlightSet = new Set(highlight ?? []);

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: { id: n.id, label: n.label ?? "?" },
        classes: [n.center ? "center" : "", highlightSet.has(n.id) ? "hl" : ""]
          .filter(Boolean)
          .join(" "),
      })),
      // Drop edges whose endpoints aren't in the node set (Cytoscape throws otherwise).
      ...graph.edges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({
          data: { source: e.source, target: e.target },
          classes: highlightSet.has(e.source) && highlightSet.has(e.target) ? "hl" : "",
        })),
    ];

    const cy: Core = cytoscape({
      container,
      elements,
      minZoom: 0.2,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: "node",
          style: {
            "background-color": nodeColor,
            label: "data(label)",
            "font-size": 10,
            color: labelColor,
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 4,
            width: 18,
            height: 18,
            "min-zoomed-font-size": 7,
            "text-background-color": labelBg,
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
            "text-background-shape": "roundrectangle",
          },
        },
        {
          selector: "node.center",
          style: {
            "background-color": accent,
            width: 34,
            height: 34,
            "font-size": 13,
            "font-weight": "bold",
            color: labelColor,
            "min-zoomed-font-size": 0,
          },
        },
        {
          selector: "node.hl",
          style: {
            "background-color": accent,
            "border-width": 3,
            "border-color": nodeColor,
            "min-zoomed-font-size": 0,
          },
        },
        {
          selector: "edge",
          style: { width: 1.4, "line-color": edgeColor, "curve-style": "haystack" },
        },
        { selector: "edge.hl", style: { "line-color": accent, width: 3 } },
      ],
      layout:
        layout === "concentric"
          ? {
              name: "concentric",
              concentric: (node) => (node.hasClass("center") ? 2 : 1),
              levelWidth: () => 1,
              minNodeSpacing: 32,
              spacingFactor: 1.1,
              padding: 60,
            }
          : { name: "cose", animate: false, padding: 50, nodeRepulsion: 8000, idealEdgeLength: 90 },
    });

    // Re-fit with extra padding so edge labels aren't clipped by the canvas.
    cy.ready(() => cy.fit(undefined, 55));

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      if (onNodeClickRef.current) onNodeClickRef.current(id);
    });

    return () => cy.destroy();
  }, [graph, layout, highlight, theme]);

  return <div ref={containerRef} className="graph-canvas" style={{ height }} />;
}
