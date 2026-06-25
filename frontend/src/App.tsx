import { useState } from "react";
import { searchArtists, importArtist, importRecordings, type ArtistSearchResult } from "./api";
import "./App.css";

type ImportState = "idle" | "importing" | "done" | "error";

function App() {
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
      const artists = await searchArtists(query);
      setResults(artists);
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
      const { count } = await importRecordings(mbid);
      setImportStates((s) => ({ ...s, [mbid]: "done" }));
      console.log(`${count} morceaux importés pour ${mbid}`);
    } catch (err) {
      console.error(err);
      setImportStates((s) => ({ ...s, [mbid]: "error" }));
    }
  }

  return (
    <main className="search-page">
      <h1>MusicGraph</h1>
      <p>Recherchez un artiste sur MusicBrainz et importez-le dans Neo4j.</p>

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
              <button
                type="button"
                onClick={() => handleImport(artist.id)}
                disabled={state === "importing" || state === "done"}
              >
                {state === "idle" && "Importer"}
                {state === "importing" && "Import en cours..."}
                {state === "done" && "Importé ✓"}
                {state === "error" && "Réessayer"}
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export default App;
