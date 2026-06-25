const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status})`);
  }
  return res.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status})`);
  }
  return res.json();
}

// --- Search & import (MusicBrainz) ---

export interface ArtistSearchResult {
  id: string;
  name: string;
  type?: string;
  country?: string;
  score?: number;
  "life-span"?: { begin?: string; end?: string };
}

export function searchArtists(query: string): Promise<ArtistSearchResult[]> {
  return getJson(`/api/search/artists?q=${encodeURIComponent(query)}`);
}

export function importArtist(mbid: string): Promise<{ status: string; mbid: string }> {
  return postJson(`/api/import/artists`, { mbid });
}

export function importRecordings(
  mbid: string
): Promise<{ status: string; mbid: string; releases: number; recordings: number }> {
  return postJson(`/api/import/recordings`, { mbid });
}

// --- Read (Neo4j) ---

export interface ArtistListItem {
  mbid: string;
  name: string;
  country: string | null;
  type: string | null;
  recordingCount: number;
  collaboratorCount: number;
}

export interface ArtistDetail {
  mbid: string;
  name: string;
  country?: string | null;
  type?: string | null;
  disambiguation?: string | null;
  beginDate?: string | null;
  endDate?: string | null;
  recordingCount: number;
  collaboratorCount: number;
  releaseCount: number;
}

export interface Recording {
  mbid: string;
  title: string;
  length?: number | null;
  firstReleaseDate?: string | null;
}

export interface Release {
  mbid: string;
  title: string;
  date?: string | null;
  country?: string | null;
  status?: string | null;
  releaseType?: string | null;
}

export interface Collaboration {
  mbid: string;
  name: string;
  country: string | null;
  type: string | null;
  sharedRecordings: number;
}

export interface ArtistGraph {
  nodes: { id: string; label: string | null; center: boolean }[];
  edges: { source: string; target: string }[];
}

export function getArtists(): Promise<ArtistListItem[]> {
  return getJson(`/api/artists`);
}

export function getArtist(mbid: string): Promise<ArtistDetail> {
  return getJson(`/api/artists/${mbid}`);
}

export function getArtistRecordings(mbid: string): Promise<Recording[]> {
  return getJson(`/api/artists/${mbid}/recordings`);
}

export function getArtistReleases(mbid: string): Promise<Release[]> {
  return getJson(`/api/artists/${mbid}/releases`);
}

export function getArtistCollaborations(mbid: string): Promise<Collaboration[]> {
  return getJson(`/api/artists/${mbid}/collaborations`);
}

export function getArtistGraph(mbid: string): Promise<ArtistGraph> {
  return getJson(`/api/graph/artists/${mbid}`);
}

// --- Stats ---

export interface StatsOverview {
  artists: number;
  recordings: number;
  releases: number;
  genres: number;
  labels: number;
  collaborations: number;
}

export interface TopArtist {
  mbid: string;
  name: string;
  collaborators: number;
  recordings: number;
}

export interface TopCollaboration {
  mbidA: string;
  artistA: string;
  mbidB: string;
  artistB: string;
  sharedRecordings: number;
}

export interface TopGenre {
  genre: string;
  artists: number;
}

export function getStatsOverview(): Promise<StatsOverview> {
  return getJson(`/api/stats/overview`);
}

export function getTopArtists(limit = 10): Promise<TopArtist[]> {
  return getJson(`/api/stats/top-artists?limit=${limit}`);
}

export function getTopCollaborations(limit = 10): Promise<TopCollaboration[]> {
  return getJson(`/api/stats/top-collaborations?limit=${limit}`);
}

export function getTopGenres(limit = 10): Promise<TopGenre[]> {
  return getJson(`/api/stats/top-genres?limit=${limit}`);
}

export function getFullGraph(limit = 200): Promise<ArtistGraph> {
  return getJson(`/api/graph?limit=${limit}`);
}
