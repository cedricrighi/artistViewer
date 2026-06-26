import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFullGraph, getArtists, getShortestPath, type ShortestPath } from "../api";
import { useResource } from "../hooks/useResource";
import { useTheme } from "../theme-context";
import { Loading, ErrorState, EmptyState } from "../components/States";

// Cytoscape is heavy; load it only on demand.
const GraphView = lazy(() => import("../components/GraphView"));

export default function GraphPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const graphRes = useResource(() => getFullGraph(300), []);
  const artistsRes = useResource(() => getArtists(), []);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [path, setPath] = useState<ShortestPath | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  const artists = useMemo(
    () => [...(artistsRes.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [artistsRes.data]
  );

  async function findPath(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to || from === to) return;
    setPathLoading(true);
    setPathError(null);
    setPath(null);
    try {
      setPath(await getShortestPath(from, to));
    } catch (err) {
      setPathError((err as Error).message);
    } finally {
      setPathLoading(false);
    }
  }

  const highlight = path?.found ? path.hops.map((h) => h.mbid) : undefined;

  return (
    <section>
      <h1>Graphe des collaborations</h1>
      <p className="lead">
        Réseau des artistes reliés par leurs collaborations. Cherchez aussi le plus court chemin
        entre deux artistes.
      </p>

      {/* Shortest-path finder */}
      <div className="card path-finder">
        <form onSubmit={findPath} className="path-form">
          <label>
            De
            <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Artiste de départ">
              <option value="">— artiste —</option>
              {artists.map((a) => (
                <option key={a.mbid} value={a.mbid}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label="Inverser"
            title="Inverser"
          >
            ⇄
          </button>
          <label>
            À
            <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Artiste d'arrivée">
              <option value="">— artiste —</option>
              {artists.map((a) => (
                <option key={a.mbid} value={a.mbid}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!from || !to || from === to || pathLoading}>
            {pathLoading ? "Recherche…" : "Trouver le chemin"}
          </button>
        </form>

        {pathError && <ErrorState message={pathError} />}
        {path && !pathError && (
          path.found ? (
            <div className="path-result">
              <span className="path-degrees">
                {path.hops.length - 1} degré{path.hops.length - 1 > 1 ? "s" : ""} de séparation
              </span>
              <div className="path-chain">
                {path.hops.map((h, i) => (
                  <span key={h.mbid} className="path-hop">
                    <Link to={`/artists/${h.mbid}`}>{h.name}</Link>
                    {i < path.hops.length - 1 && <span className="path-arrow">→</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState>Aucun chemin de collaboration entre ces deux artistes.</EmptyState>
          )
        )}
      </div>

      {/* Global graph */}
      {graphRes.loading ? (
        <Loading />
      ) : graphRes.error ? (
        <ErrorState message={graphRes.error} onRetry={graphRes.reload} />
      ) : !graphRes.data || graphRes.data.nodes.length === 0 ? (
        <EmptyState>
          Le graphe est vide. <Link to="/search">Importez des artistes</Link> pour le peupler.
        </EmptyState>
      ) : (
        <div className="graph-wrap">
          <p className="graph-hint">
            {graphRes.data.nodes.length} artistes · {graphRes.data.edges.length} collaborations —
            glissez, zoomez, cliquez un nœud pour ouvrir la fiche.
          </p>
          <Suspense fallback={<Loading label="Chargement du graphe…" />}>
            <GraphView
              graph={graphRes.data}
              layout="cose"
              height={560}
              highlight={highlight}
              theme={theme}
              onNodeClick={(id) => navigate(`/artists/${id}`)}
            />
          </Suspense>
        </div>
      )}
    </section>
  );
}
