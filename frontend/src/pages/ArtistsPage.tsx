import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getArtists, type ArtistListItem } from "../api";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getArtists()
      .then(setArtists)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <section>
      <h1>Artistes importés</h1>
      {artists.length === 0 ? (
        <p>
          Aucun artiste importé. <Link to="/search">Lancer une recherche</Link>.
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Artiste</th>
              <th>Pays</th>
              <th>Morceaux</th>
              <th>Collaborateurs</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((a) => (
              <tr key={a.mbid}>
                <td>
                  <Link to={`/artists/${a.mbid}`}>{a.name}</Link>
                </td>
                <td>{a.country ?? "—"}</td>
                <td>{a.recordingCount}</td>
                <td>{a.collaboratorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
