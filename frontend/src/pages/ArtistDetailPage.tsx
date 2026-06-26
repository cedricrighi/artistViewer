import { lazy, Suspense, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getArtist,
  getArtistRecordings,
  getArtistReleases,
  getArtistCollaborations,
  getArtistGraph,
} from "../api";
import { useResource, type Resource } from "../hooks/useResource";
import { useTheme } from "../theme-context";
import { Loading, ErrorState, EmptyState } from "../components/States";
import CoverArt from "../components/CoverArt";

// Cytoscape is heavy; load it only when the graph tab is opened.
const GraphView = lazy(() => import("../components/GraphView"));

type Tab = "recordings" | "releases" | "collaborations" | "graph";

const TAB_LABELS: Record<Tab, string> = {
  recordings: "Morceaux",
  releases: "Albums",
  collaborations: "Collaborations",
  graph: "Graphe",
};

function formatLength(ms?: number | null): string {
  if (!ms) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export default function ArtistDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>("recordings");

  // Each resource loads independently: a failure in one tab never blanks the page.
  const artist = useResource(() => getArtist(id), [id]);
  const recordings = useResource(() => getArtistRecordings(id), [id]);
  const releases = useResource(() => getArtistReleases(id), [id]);
  const collaborations = useResource(() => getArtistCollaborations(id), [id]);
  const graph = useResource(() => getArtistGraph(id), [id]);

  if (artist.loading) return <Loading />;
  if (artist.error || !artist.data) {
    return <ErrorState message={artist.error ?? "Artiste introuvable."} onRetry={artist.reload} />;
  }

  const a = artist.data;

  return (
    <section>
      <Link to="/artists" className="back-link">
        ← Tous les artistes
      </Link>
      <h1>{a.name}</h1>
      <div className="artist-meta">
        {a.type && <span className="badge">{a.type}</span>}
        {a.country && <span className="badge">{a.country}</span>}
        {(a.beginDate || a.endDate) && (
          <span className="badge">
            {a.beginDate ?? "?"}
            {a.endDate ? `–${a.endDate}` : ""}
          </span>
        )}
        {a.disambiguation && <span>{a.disambiguation}</span>}
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{a.recordingCount}</span> morceaux
        </div>
        <div className="stat-card">
          <span className="stat-value">{a.releaseCount}</span> albums/releases
        </div>
        <div className="stat-card">
          <span className="stat-value">{a.collaboratorCount}</span> collaborateurs
        </div>
      </div>

      <nav className="tabs" role="tablist" aria-label="Détails de l'artiste">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {tab === "recordings" && (
        <Section res={recordings} empty="Aucun morceau.">
          {(rows) => (
            <div className="card table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Durée</th>
                    <th>1ère sortie</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.mbid}>
                      <td>{r.title}</td>
                      <td className="num">{formatLength(r.length)}</td>
                      <td className="num">{r.firstReleaseDate ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "releases" && (
        <Section res={releases} empty="Aucun album.">
          {(rows) => (
            <div className="cover-grid">
              {rows.map((r) => (
                <article key={r.mbid} className="release-card">
                  <CoverArt mbid={r.mbid} title={r.title} />
                  <div className="release-body">
                    <div className="release-title">{r.title}</div>
                    <div className="meta-row">
                      {r.releaseType && <span className="badge">{r.releaseType}</span>}
                      {r.date && <span className="badge">{r.date}</span>}
                      {r.country && <span className="badge">{r.country}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Section>
      )}

      {tab === "collaborations" && (
        <Section res={collaborations} empty="Aucune collaboration détectée.">
          {(rows) => (
            <div className="card table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Artiste</th>
                    <th>Morceaux en commun</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.mbid}>
                      <td>
                        <Link to={`/artists/${c.mbid}`}>{c.name}</Link>
                      </td>
                      <td className="num">{c.sharedRecordings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "graph" && (
        <Section res={graph} empty="Aucune collaboration à visualiser.">
          {(g) =>
            g.edges.length === 0 ? (
              <EmptyState>Aucune collaboration à visualiser.</EmptyState>
            ) : (
              <div className="graph-wrap">
                <p className="graph-hint">
                  Glissez les nœuds, zoomez à la molette, cliquez un artiste pour ouvrir sa fiche.
                </p>
                <Suspense fallback={<Loading label="Chargement du graphe…" />}>
                  <GraphView
                    graph={g}
                    layout="concentric"
                    theme={theme}
                    onNodeClick={(nodeId) => nodeId !== id && navigate(`/artists/${nodeId}`)}
                  />
                </Suspense>
              </div>
            )
          }
        </Section>
      )}
    </section>
  );
}

// Renders a resource's loading / error / empty / content states uniformly.
function Section<T>({
  res,
  empty,
  children,
}: {
  res: Resource<T>;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (res.loading) return <Loading />;
  if (res.error) return <ErrorState message={res.error} onRetry={res.reload} />;
  if (res.data == null) return <EmptyState>{empty}</EmptyState>;
  if (Array.isArray(res.data) && res.data.length === 0) return <EmptyState>{empty}</EmptyState>;
  return <>{children(res.data)}</>;
}
