import { Link } from "react-router-dom";
import {
  getTopArtists,
  getTopCollaborations,
  getTopGenres,
  getTopRecordings,
} from "../api";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorState, EmptyState } from "../components/States";

export default function StatsPage() {
  const artists = useResource(() => getTopArtists(10), []);
  const collaborations = useResource(() => getTopCollaborations(10), []);
  const recordings = useResource(() => getTopRecordings(10), []);
  const genres = useResource(() => getTopGenres(20), []);

  return (
    <section>
      <h1>Statistiques</h1>
      <p className="lead">Analyse du graphe : artistes les plus connectés, collaborations, morceaux et genres.</p>

      <h2 className="section-title">Artistes les plus connectés</h2>
      {artists.loading ? (
        <Loading />
      ) : artists.error ? (
        <ErrorState message={artists.error} onRetry={artists.reload} />
      ) : (
        <div className="card table-scroll">
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
              {(artists.data ?? []).map((a, i) => (
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
      )}

      <h2 className="section-title">Top collaborations</h2>
      {collaborations.loading ? (
        <Loading />
      ) : collaborations.error ? (
        <ErrorState message={collaborations.error} onRetry={collaborations.reload} />
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Duo</th>
                <th>Morceaux en commun</th>
              </tr>
            </thead>
            <tbody>
              {(collaborations.data ?? []).map((c, i) => (
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
      )}

      <h2 className="section-title">Morceaux les plus collaboratifs</h2>
      {recordings.loading ? (
        <Loading />
      ) : recordings.error ? (
        <ErrorState message={recordings.error} onRetry={recordings.reload} />
      ) : (recordings.data ?? []).length === 0 ? (
        <EmptyState>Aucun morceau.</EmptyState>
      ) : (
        <div className="card table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Titre</th>
                <th>Artistes crédités</th>
              </tr>
            </thead>
            <tbody>
              {(recordings.data ?? []).map((r, i) => (
                <tr key={r.mbid}>
                  <td className="num">{i + 1}</td>
                  <td>{r.title}</td>
                  <td className="num">{r.artistCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Genres les plus présents</h2>
      {genres.loading ? (
        <Loading />
      ) : genres.error ? (
        <ErrorState message={genres.error} onRetry={genres.reload} />
      ) : (genres.data ?? []).length === 0 ? (
        <EmptyState>Aucun genre (réimporte des artistes pour les peupler).</EmptyState>
      ) : (
        <div className="genre-cloud">
          {(genres.data ?? []).map((g) => (
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
