import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTopArtists,
  getTopCollaborations,
  getTopGenres,
  type TopArtist,
  type TopCollaboration,
  type TopGenre,
} from "../api";

export default function StatsPage() {
  const [artists, setArtists] = useState<TopArtist[]>([]);
  const [collaborations, setCollaborations] = useState<TopCollaboration[]>([]);
  const [genres, setGenres] = useState<TopGenre[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTopArtists(10), getTopCollaborations(10), getTopGenres(10)])
      .then(([a, c, g]) => {
        setArtists(a);
        setCollaborations(c);
        setGenres(g);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Statistiques</h1>
      <p className="lead">Analyse du graphe : artistes les plus connectés, collaborations et genres.</p>

      <h2 className="section-title">Artistes les plus connectés</h2>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Artiste</th>
              <th>Collaborateurs</th>
              <th>Morceaux</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((a, i) => (
              <tr key={a.mbid}>
                <td className="num">{i + 1}</td>
                <td>
                  <Link to={`/artists/${a.mbid}`}>{a.name}</Link>
                </td>
                <td className="num">{a.collaborators}</td>
                <td className="num">{a.recordings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Top collaborations</h2>
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Duo</th>
              <th>Morceaux en commun</th>
            </tr>
          </thead>
          <tbody>
            {collaborations.map((c, i) => (
              <tr key={`${c.mbidA}-${c.mbidB}`}>
                <td className="num">{i + 1}</td>
                <td>
                  <Link to={`/artists/${c.mbidA}`}>{c.artistA}</Link>
                  {" × "}
                  <Link to={`/artists/${c.mbidB}`}>{c.artistB}</Link>
                </td>
                <td className="num">{c.sharedRecordings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Genres les plus présents</h2>
      {genres.length === 0 ? (
        <div className="empty-state">Aucun genre (réimporte des artistes pour les peupler).</div>
      ) : (
        <div className="genre-cloud">
          {genres.map((g) => (
            <span key={g.genre} className="badge badge-accent genre-chip">
              {g.genre}
              <span className="genre-count">{g.artists}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
