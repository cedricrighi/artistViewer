const MIN_INTERVAL_MS = 1000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

class MusicBrainzError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "MusicBrainzError";
  }
}

function getBaseUrl(): string {
  return process.env.MUSICBRAINZ_BASE_URL ?? "https://musicbrainz.org/ws/2";
}

function getUserAgent(): string {
  return process.env.MUSICBRAINZ_USER_AGENT ?? "MusicGraph/1.0 (contact@example.com)";
}

// Retry on transient network failures (ECONNRESET, timeouts — surfaced as
// TypeError by fetch) and on MusicBrainz rate-limit/unavailable statuses.
function isRetryable(error: unknown): boolean {
  if (error instanceof MusicBrainzError) {
    return error.status === 429 || error.status === 503;
  }
  return error instanceof TypeError;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { "User-Agent": getUserAgent() },
  });
  if (!res.ok) {
    throw new MusicBrainzError(
      `MusicBrainz request failed: ${res.status} ${res.statusText}`,
      res.status
    );
  }
  return (await res.json()) as T;
}

async function mbFetchJson<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
    try {
      return await throttled(() => fetchJson<T>(path));
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
    }
  }
  throw lastError;
}

export interface MusicBrainzArea {
  id: string;
  name: string;
  type?: string | null;
}

export interface MusicBrainzGenre {
  id: string;
  name: string;
  count?: number;
}

export interface MusicBrainzArtist {
  id: string;
  name: string;
  type?: string;
  country?: string;
  disambiguation?: string;
  score?: number;
  "life-span"?: { begin?: string; end?: string };
  area?: MusicBrainzArea | null;
  genres?: MusicBrainzGenre[];
}

interface SearchArtistsResponse {
  artists: MusicBrainzArtist[];
}

export async function searchArtists(query: string): Promise<MusicBrainzArtist[]> {
  const data = await mbFetchJson<SearchArtistsResponse>(
    `/artist?query=${encodeURIComponent(query)}&fmt=json`
  );
  return data.artists ?? [];
}

export async function lookupArtist(mbid: string): Promise<MusicBrainzArtist> {
  return mbFetchJson<MusicBrainzArtist>(`/artist/${mbid}?inc=genres&fmt=json`);
}

export interface MusicBrainzArtistCredit {
  name: string;
  joinphrase?: string;
  artist: { id: string; name: string };
}

export interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  "first-release-date"?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzTrack {
  recording: MusicBrainzRecording;
}

export interface MusicBrainzMedium {
  tracks?: MusicBrainzTrack[];
}

export interface MusicBrainzLabelInfo {
  label?: { id: string; name: string } | null;
}

export interface MusicBrainzReleaseEvent {
  date?: string;
  area?: MusicBrainzArea | null;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  status?: string;
  "release-group"?: { "primary-type"?: string };
  media?: MusicBrainzMedium[];
  "label-info"?: MusicBrainzLabelInfo[];
  "release-events"?: MusicBrainzReleaseEvent[];
}

interface BrowseReleasesResponse {
  releases: MusicBrainzRelease[];
}

// Browse releases by artist with nested recordings: the recording browse
// endpoint does not accept `releases` as an inc, so we go releases-first and
// get releases, their recordings, credits, and labels in one call.
export async function fetchReleasesForArtist(
  artistMbid: string,
  limit = 25
): Promise<MusicBrainzRelease[]> {
  const data = await mbFetchJson<BrowseReleasesResponse>(
    `/release?artist=${artistMbid}&inc=recordings+artist-credits+release-groups+labels&limit=${limit}&fmt=json`
  );
  return data.releases ?? [];
}
