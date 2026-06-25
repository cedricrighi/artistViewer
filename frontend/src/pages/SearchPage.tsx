import { useState } from "react";
import { Link } from "react-router-dom";
import { searchArtists, importArtist, importRecordings, type ArtistSearchResult } from "../api";

type ImportState = "idle" | "importing" | "done" | "error";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({});

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchArtists(query));
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function handleImport(mbid: string) {
    setImportStates((s) => ({ ...s, [mbid]: "importing" }));
    try {
      await importArtist(mbid);
      await importRecordings(mbid);
      setImportStates((s) => ({ ...s, [mbid]: "done" }));
    } catch (err) {
      console.error(err);
      setImportStates((s) => ({ ...s, [mbid]: "error" }));
    }
  }

  return (
    <section>
      <h1>Rechercher un artiste</h1>
      <p>Recherchez sur MusicBrainz et importez l'artiste (et ses morceaux) dans Neo4j.</p>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Daft Punk, Stromae, Angèle..."
        />
        <button type="submit" disabled={searching}>
          {searching ? "Recherche..." : "Rechercher"}
        </button>
      </form>

      {searchError && <p className="error">{searchError}</p>}

      <ul className="results">
        {results.map((artist) => {
          const state = importStates[artist.id] ?? "idle";
          return (
            <li key={artist.id} className="result-card">
              <div>
                <strong>{artist.name}</strong>
                {artist.type && <span> · {artist.type}</span>}
                {artist.country && <span> · {artist.country}</span>}
                {artist["life-span"]?.begin && <span> · depuis {artist["life-span"]?.begin}</span>}
                {typeof artist.score === "number" && <span> · score {artist.score}</span>}
                <div className="mbid">{artist.id}</div>
              </div>
              <div className="result-actions">
                {state === "done" ? (
                  <Link to={`/artists/${artist.id}`}>Voir la fiche →</Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleImport(artist.id)}
                    disabled={state === "importing"}
                  >
                    {state === "idle" && "Importer"}
                    {state === "importing" && "Import en cours..."}
                    {state === "error" && "Réessayer"}
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
