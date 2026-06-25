import { useNavigate } from "react-router-dom";
import type { ArtistGraph } from "../api";

// Simple radial ego graph: the central artist in the middle, collaborators
// laid out on a circle around it. Lightweight SVG, no external graph library.
export default function EgoGraph({ graph }: { graph: ArtistGraph }) {
  const navigate = useNavigate();
  const size = 480;
  const center = size / 2;
  const radius = size / 2 - 60;

  const neighbors = graph.nodes.filter((n) => !n.center);
  const centerNode = graph.nodes.find((n) => n.center);

  const positions = new Map<string, { x: number; y: number }>();
  if (centerNode) positions.set(centerNode.id, { x: center, y: center });
  neighbors.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(neighbors.length, 1) - Math.PI / 2;
    positions.set(n.id, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    });
  });

  if (!centerNode) return <p>Aucune donnée de graphe.</p>;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="ego-graph" role="img" aria-label="Graphe de collaborations">
      {graph.edges.map((e, i) => {
        const a = positions.get(e.source);
        const b = positions.get(e.target);
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="ego-edge" />;
      })}
      {graph.nodes.map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        return (
          <g
            key={n.id}
            transform={`translate(${p.x}, ${p.y})`}
            className={n.center ? "ego-node center" : "ego-node"}
            onClick={() => !n.center && navigate(`/artists/${n.id}`)}
          >
            <circle r={n.center ? 26 : 16} />
            <text dy={n.center ? 0 : -22} textAnchor="middle">
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
