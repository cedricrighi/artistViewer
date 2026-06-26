const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

/** Cover Art Archive front cover for a release (no API key needed). */
export function coverArtUrl(releaseMbid: string, size: 250 | 500 = 250): string {
  return `https://coverartarchive.org/release/${releaseMbid}/front-${size}`;
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Surface the backend's JSON `message` when present, else a readable fallback.
async function toApiError(res: Response): Promise<ApiError> {
  let message = `Erreur ${res.status}`;
  try {
    const data = await res.json();
    if (data && typeof data.message === "string") message = data.message;
  } catch {
    /* non-JSON error body — keep the status fallback */
  }
  return new ApiError(message, res.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    // fetch only rejects on network errors (server down, CORS, offline).
    throw new ApiError("Serveur injoignable — vérifiez que le backend est démarré.");
  }
  if (!res.ok) throw await toApiError(res);
  return res.json();
}

function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Search & import (MusicBrainz) ---

export interface ArtistSearchResult {
  id: string;
  name: string;
  type?: string;
  country?: string;
  score?: number;
  disambiguation?: string;
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

export interface RecordingListItem extends Recording {
  artists: string[];
  artistCount: number;
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

export interface GraphNode {
  id: string;
  label: string | null;
  center?: boolean;
}

export interface ArtistGraph {
  nodes: GraphNode[];
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

export function getRecordings(limit = 200): Promise<RecordingListItem[]> {
  return getJson(`/api/recordings?limit=${limit}`);
}

export function getFullGraph(limit = 200): Promise<ArtistGraph> {
  return getJson(`/api/graph?limit=${limit}`);
}

export interface ShortestPath {
  found: boolean;
  hops: { mbid: string; name: string }[];
}

export function getShortestPath(from: string, to: string): Promise<ShortestPath> {
  return getJson(`/api/graph/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
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

export interface TopRecording {
  mbid: string;
  title: string;
  artistCount: number;
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

export function getTopRecordings(limit = 10): Promise<TopRecording[]> {
  return getJson(`/api/stats/top-recordings?limit=${limit}`);
}
