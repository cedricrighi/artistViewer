import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getArtist,
  getArtistRecordings,
  getArtistReleases,
  getArtistCollaborations,
  getArtistGraph,
  type ArtistDetail,
  type Recording,
  type Release,
  type Collaboration,
  type ArtistGraph,
} from "../api";
import EgoGraph from "../components/EgoGraph";

type Tab = "recordings" | "releases" | "collaborations" | "graph";

function formatLength(ms?: number | null): string {
  if (!ms) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export default function ArtistDetailPage() {
  const { id = "" } = useParams();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [graph, setGraph] = useState<ArtistGraph | null>(null);
  const [tab, setTab] = useState<Tab>("recordings");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      getArtist(id),
      getArtistRecordings(id),
      getArtistReleases(id),
      getArtistCollaborations(id),
      getArtistGraph(id),
    ])
      .then(([a, recs, rels, collabs, g]) => {
        setArtist(a);
        setRecordings(recs);
        setReleases(rels);
        setCollaborations(collabs);
        setGraph(g);
      })
      .catch((err) => setError((err as Error).message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!artist) return <p>Chargement...</p>;

  return (
    <section>
      <p>
        <Link to="/artists">← Tous les artistes</Link>
      </p>
      <h1>{artist.name}</h1>
      <p className="artist-meta">
        {[artist.type, artist.country, artist.disambiguation].filter(Boolean).join(" · ")}
        {artist.beginDate && ` · ${artist.beginDate}${artist.endDate ? `–${artist.endDate}` : ""}`}
      </p>
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{artist.recordingCount}</span> morceaux
        </div>
        <div className="stat-card">
          <span className="stat-value">{artist.releaseCount}</span> albums/releases
        </div>
        <div className="stat-card">
          <span className="stat-value">{artist.collaboratorCount}</span> collaborateurs
        </div>
      </div>

      <nav className="tabs">
        {(["recordings", "releases", "collaborations", "graph"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t === "recordings" && "Morceaux"}
            {t === "releases" && "Albums"}
            {t === "collaborations" && "Collaborations"}
            {t === "graph" && "Graphe"}
          </button>
        ))}
      </nav>

      {tab === "recordings" && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Durée</th>
              <th>1ère sortie</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((r) => (
              <tr key={r.mbid}>
                <td>{r.title}</td>
                <td>{formatLength(r.length)}</td>
                <td>{r.firstReleaseDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "releases" && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Date</th>
              <th>Pays</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((r) => (
              <tr key={r.mbid}>
                <td>{r.title}</td>
                <td>{r.releaseType ?? "—"}</td>
                <td>{r.date ?? "—"}</td>
                <td>{r.country ?? "—"}</td>
                <td>{r.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "collaborations" && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Artiste</th>
              <th>Morceaux en commun</th>
            </tr>
          </thead>
          <tbody>
            {collaborations.map((c) => (
              <tr key={c.mbid}>
                <td>
                  <Link to={`/artists/${c.mbid}`}>{c.name}</Link>
                </td>
                <td>{c.sharedRecordings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "graph" && graph && <EgoGraph graph={graph} />}
    </section>
  );
}
