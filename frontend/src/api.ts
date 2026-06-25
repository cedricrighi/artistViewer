const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface ArtistSearchResult {
  id: string;
  name: string;
  type?: string;
  country?: string;
  score?: number;
  "life-span"?: { begin?: string; end?: string };
}

export async function searchArtists(query: string): Promise<ArtistSearchResult[]> {
  const res = await fetch(`${API_BASE_URL}/api/search/artists?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Recherche échouée (${res.status})`);
  }
  return res.json();
}

export async function importArtist(mbid: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/import/artists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mbid }),
  });
  if (!res.ok) {
    throw new Error(`Import artiste échoué (${res.status})`);
  }
}

export async function importRecordings(mbid: string): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE_URL}/api/import/recordings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mbid }),
  });
  if (!res.ok) {
    throw new Error(`Import morceaux échoué (${res.status})`);
  }
  return res.json();
}
