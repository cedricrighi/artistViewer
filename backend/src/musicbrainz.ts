const MIN_INTERVAL_MS = 1000;

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

export interface MusicBrainzArtist {
  id: string;
  name: string;
  type?: string;
  country?: string;
  disambiguation?: string;
  score?: number;
  "life-span"?: { begin?: string; end?: string };
}

interface SearchArtistsResponse {
  artists: MusicBrainzArtist[];
}

function getBaseUrl(): string {
  return process.env.MUSICBRAINZ_BASE_URL ?? "https://musicbrainz.org/ws/2";
}

function getUserAgent(): string {
  return process.env.MUSICBRAINZ_USER_AGENT ?? "MusicGraph/1.0 (contact@example.com)";
}

export async function searchArtists(query: string): Promise<MusicBrainzArtist[]> {
  return throttled(async () => {
    const url = `${getBaseUrl()}/artist?query=${encodeURIComponent(query)}&fmt=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": getUserAgent() },
    });
    if (!res.ok) {
      throw new Error(`MusicBrainz search failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as SearchArtistsResponse;
    return data.artists ?? [];
  });
}

export async function lookupArtist(mbid: string): Promise<MusicBrainzArtist> {
  return throttled(async () => {
    const url = `${getBaseUrl()}/artist/${mbid}?fmt=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": getUserAgent() },
    });
    if (!res.ok) {
      throw new Error(`MusicBrainz lookup failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as MusicBrainzArtist;
  });
}
