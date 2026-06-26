import { useState } from "react";
import { Link } from "react-router-dom";
import { searchArtists, importArtist, importRecordings, type ArtistSearchResult } from "../api";
import { Loading, ErrorState, EmptyState } from "../components/States";

type ImportState = "idle" | "importing" | "done" | "error";
interface ImportInfo {
  state: ImportState;
  message?: string;
}

const EXAMPLES = ["Daft Punk", "Stromae", "Angèle", "SCH", "PNL", "Kendrick Lamar"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [importStates, setImportStates] = useState<Record<string, ImportInfo>>({});

  async function runSearch(term: string) {
    const q = term.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchArtists(q));
      setHasSearched(true);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  function pickExample(name: string) {
    setQuery(name);
    runSearch(name);
  }

  async function handleImport(mbid: string) {
    setImportStates((s) => ({ ...s, [mbid]: { state: "importing" } }));
    try {
      await importArtist(mbid);
      const res = await importRecordings(mbid);
      setImportStates((s) => ({
        ...s,
        [mbid]: { state: "done", message: `${res.recordings} morceaux · ${res.releases} releases` },
      }));
    } catch (err) {
      setImportStates((s) => ({
        ...s,
        [mbid]: { state: "error", message: (err as Error).message },
      }));
    }
  }

  return (
    <section>
      <h1>Rechercher un artiste</h1>
      <p className="lead">Recherchez sur MusicBrainz et importez l'artiste (et ses morceaux) dans Neo4j.</p>

      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Daft Punk, Stromae, Angèle…"
          aria-label="Nom d'artiste"
        />
        <button type="submit" disabled={searching || !query.trim()}>
          {searching ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      <div className="example-chips">
        <span className="example-label">Exemples :</span>
        {EXAMPLES.map((name) => (
          <button key={name} type="button" className="chip" onClick={() => pickExample(name)}>
            {name}
          </button>
        ))}
      </div>

      {searching && <Loading label="Recherche sur MusicBrainz…" />}
      {searchError && <ErrorState message={searchError} onRetry={() => runSearch(query)} />}
      {!searching && !searchError && hasSearched && results.length === 0 && (
        <EmptyState>Aucun artiste trouvé pour « {query} ».</EmptyState>
      )}

      <ul className="results">
        {results.map((artist) => {
          const info = importStates[artist.id] ?? { state: "idle" as ImportState };
          return (
            <li key={artist.id} className="result-card">
              <div>
                <div className="result-name">{artist.name}</div>
                <div className="meta-row">
                  {artist.type && <span className="badge">{artist.type}</span>}
                  {artist.country && <span className="badge">{artist.country}</span>}
                  {artist["life-span"]?.begin && (
                    <span className="badge">depuis {artist["life-span"]?.begin}</span>
                  )}
                  {typeof artist.score === "number" && (
                    <span className="badge badge-accent">score {artist.score}</span>
                  )}
                </div>
                {artist.disambiguation && <div className="result-note">{artist.disambiguation}</div>}
                <div className="mbid">{artist.id}</div>
                {info.message && (
                  <div className={info.state === "error" ? "import-msg error-text" : "import-msg success-text"}>
                    {info.state === "error" ? `Échec : ${info.message}` : `Importé · ${info.message}`}
                  </div>
                )}
              </div>
              <div className="result-actions">
                {info.state === "done" ? (
                  <Link to={`/artists/${artist.id}`} className="btn btn-ghost">
                    Voir la fiche →
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleImport(artist.id)}
                    disabled={info.state === "importing"}
                  >
                    {info.state === "idle" && "Importer"}
                    {info.state === "importing" && "Import…"}
                    {info.state === "error" && "Réessayer"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
