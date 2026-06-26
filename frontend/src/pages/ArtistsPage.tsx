import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getArtists } from "../api";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorState, EmptyState } from "../components/States";

export default function ArtistsPage() {
  const { data, error, loading, reload } = useResource(() => getArtists(), []);
  const [filter, setFilter] = useState("");

  const artists = data ?? [];
  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = filter.trim().toLowerCase();
    return q ? list.filter((a) => a.name.toLowerCase().includes(q)) : list;
  }, [data, filter]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <section>
      <h1>Artistes importés</h1>
      <p className="lead">
        {artists.length} artiste{artists.length > 1 ? "s" : ""} dans le graphe.
      </p>

      {artists.length === 0 ? (
        <EmptyState>
          Aucun artiste importé. <Link to="/search">Lancer une recherche</Link>.
        </EmptyState>
      ) : (
        <>
          <input
            type="search"
            className="filter-input"
            placeholder="Filtrer par nom…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrer les artistes"
          />
          {filtered.length === 0 ? (
            <EmptyState>Aucun artiste ne correspond à « {filter} ».</EmptyState>
          ) : (
            <div className="card table-scroll">
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
                  {filtered.map((a) => (
                    <tr key={a.mbid}>
                      <td>
                        <Link to={`/artists/${a.mbid}`}>{a.name}</Link>
                      </td>
                      <td>{a.country ? <span className="badge">{a.country}</span> : "—"}</td>
                      <td className="num">{a.recordingCount}</td>
                      <td className="num">{a.collaboratorCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
