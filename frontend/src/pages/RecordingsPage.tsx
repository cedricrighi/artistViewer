import { useMemo, useState } from "react";
import { getRecordings, type RecordingListItem } from "../api";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorState, EmptyState } from "../components/States";

type SortKey = "title" | "date" | "artists";

function formatLength(ms?: number | null): string {
  if (!ms) return "—";
  const totalSec = Math.round(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

export default function RecordingsPage() {
  const { data, error, loading, reload } = useResource(() => getRecordings(300), []);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("date");

  const recordings = data ?? [];
  const visible = useMemo(() => {
    const list = data ?? [];
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.artists.some((a) => a.toLowerCase().includes(q))
        )
      : list;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "artists") return b.artistCount - a.artistCount;
      return (b.firstReleaseDate ?? "").localeCompare(a.firstReleaseDate ?? "");
    });
    return sorted;
  }, [data, filter, sort]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <section>
      <h1>Morceaux</h1>
      <p className="lead">{recordings.length} morceaux dans le graphe.</p>

      {recordings.length === 0 ? (
        <EmptyState>Aucun morceau. Importez un artiste depuis la recherche.</EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="filter-input"
              placeholder="Filtrer par titre ou artiste…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtrer les morceaux"
            />
            <label className="sort-control">
              Trier par
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="date">Date de sortie</option>
                <option value="title">Titre</option>
                <option value="artists">Nb d'artistes</option>
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <EmptyState>Aucun morceau ne correspond à « {filter} ».</EmptyState>
          ) : (
            <div className="card table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Artistes</th>
                    <th>Durée</th>
                    <th>1ère sortie</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r: RecordingListItem) => (
                    <tr key={r.mbid}>
                      <td>{r.title}</td>
                      <td>
                        {r.artists.join(", ") || "—"}
                        {r.artistCount > 1 && (
                          <span className="badge badge-accent feat-badge">{r.artistCount}</span>
                        )}
                      </td>
                      <td className="num">{formatLength(r.length)}</td>
                      <td className="num">{r.firstReleaseDate ?? "—"}</td>
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
