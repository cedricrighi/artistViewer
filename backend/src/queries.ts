import neo4j from "neo4j-driver";
import { getDriver } from "./neo4j.js";

// LIMIT requires a Neo4j integer; JS numbers are sent as floats by the driver.
function neo4jInt(value: number) {
  return neo4j.int(value);
}

async function read<T>(cypher: string, params: Record<string, unknown>, map: (record: any) => T): Promise<T[]> {
  const session = getDriver().session({ defaultAccessMode: "READ" });
  try {
    const result = await session.run(cypher, params);
    return result.records.map(map);
  } finally {
    await session.close();
  }
}

export async function listArtists() {
  return read(
    `MATCH (a:Artist)
     OPTIONAL MATCH (a)-[:PERFORMED]->(r:Recording)
     OPTIONAL MATCH (a)-[:COLLABORATED_WITH]-(c:Artist)
     RETURN a.mbid AS mbid, a.name AS name, a.country AS country, a.type AS type,
            count(DISTINCT r) AS recordingCount, count(DISTINCT c) AS collaboratorCount
     ORDER BY collaboratorCount DESC, recordingCount DESC, a.name`,
    {},
    (rec) => ({
      mbid: rec.get("mbid"),
      name: rec.get("name"),
      country: rec.get("country"),
      type: rec.get("type"),
      recordingCount: rec.get("recordingCount"),
      collaboratorCount: rec.get("collaboratorCount"),
    })
  );
}

export async function getArtist(mbid: string) {
  const rows = await read(
    `MATCH (a:Artist {mbid: $mbid})
     OPTIONAL MATCH (a)-[:PERFORMED]->(r:Recording)
     OPTIONAL MATCH (a)-[:COLLABORATED_WITH]-(c:Artist)
     OPTIONAL MATCH (a)-[:PERFORMED]->(:Recording)-[:APPEARS_ON]->(rel:Release)
     RETURN a { .* } AS artist,
            count(DISTINCT r) AS recordingCount,
            count(DISTINCT c) AS collaboratorCount,
            count(DISTINCT rel) AS releaseCount`,
    { mbid },
    (rec) => ({
      ...rec.get("artist"),
      recordingCount: rec.get("recordingCount"),
      collaboratorCount: rec.get("collaboratorCount"),
      releaseCount: rec.get("releaseCount"),
    })
  );
  return rows[0] ?? null;
}

export async function getArtistRecordings(mbid: string) {
  return read(
    `MATCH (:Artist {mbid: $mbid})-[:PERFORMED]->(r:Recording)
     RETURN r { .* } AS recording
     ORDER BY coalesce(r.firstReleaseDate, ''), r.title`,
    { mbid },
    (rec) => rec.get("recording")
  );
}

export async function getArtistReleases(mbid: string) {
  return read(
    `MATCH (:Artist {mbid: $mbid})-[:PERFORMED]->(:Recording)-[:APPEARS_ON]->(rel:Release)
     WITH DISTINCT rel
     RETURN rel { .* } AS release
     ORDER BY coalesce(rel.date, ''), rel.title`,
    { mbid },
    (rec) => rec.get("release")
  );
}

export async function getArtistCollaborations(mbid: string) {
  return read(
    `MATCH (:Artist {mbid: $mbid})-[:COLLABORATED_WITH]->(other:Artist)
     OPTIONAL MATCH (:Artist {mbid: $mbid})-[:PERFORMED]->(r:Recording)<-[:FEATURED_ON]-(other)
     RETURN other.mbid AS mbid, other.name AS name, other.country AS country,
            other.type AS type, count(DISTINCT r) AS sharedRecordings
     ORDER BY sharedRecordings DESC, other.name`,
    { mbid },
    (rec) => ({
      mbid: rec.get("mbid"),
      name: rec.get("name"),
      country: rec.get("country"),
      type: rec.get("type"),
      sharedRecordings: rec.get("sharedRecordings"),
    })
  );
}

// Ego graph: the artist plus its direct collaborators, for visualization.
export async function getArtistGraph(mbid: string) {
  const rows = await read(
    `MATCH (a:Artist {mbid: $mbid})
     OPTIONAL MATCH (a)-[:COLLABORATED_WITH]-(other:Artist)
     RETURN a.mbid AS centerMbid, a.name AS centerName,
            collect(DISTINCT { mbid: other.mbid, name: other.name }) AS neighbors`,
    { mbid },
    (rec) => ({
      centerMbid: rec.get("centerMbid"),
      centerName: rec.get("centerName"),
      neighbors: (rec.get("neighbors") as { mbid: string | null; name: string | null }[]).filter(
        (n) => n.mbid
      ),
    })
  );
  const row = rows[0];
  if (!row) return null;
  const nodes = [
    { id: row.centerMbid, label: row.centerName, center: true },
    ...row.neighbors.map((n) => ({ id: n.mbid as string, label: n.name, center: false })),
  ];
  const edges = row.neighbors.map((n) => ({ source: row.centerMbid, target: n.mbid as string }));
  return { nodes, edges };
}

// --- Recordings & releases (global) ---

export async function listRecordings(limit = 100) {
  return read(
    `MATCH (r:Recording)
     RETURN r { .* } AS recording
     ORDER BY coalesce(r.firstReleaseDate, ''), r.title
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => rec.get("recording")
  );
}

export async function getRecording(mbid: string) {
  const rows = await read(
    `MATCH (r:Recording {mbid: $mbid})
     OPTIONAL MATCH (a:Artist)-[role:PERFORMED|FEATURED_ON]->(r)
     OPTIONAL MATCH (r)-[:APPEARS_ON]->(rel:Release)
     RETURN r { .* } AS recording,
            collect(DISTINCT CASE WHEN a IS NULL THEN null
              ELSE { mbid: a.mbid, name: a.name, role: type(role) } END) AS artists,
            collect(DISTINCT CASE WHEN rel IS NULL THEN null ELSE rel { .* } END) AS releases`,
    { mbid },
    (rec) => ({
      ...rec.get("recording"),
      artists: (rec.get("artists") as unknown[]).filter(Boolean),
      releases: (rec.get("releases") as unknown[]).filter(Boolean),
    })
  );
  return rows[0] ?? null;
}

export async function listReleases(limit = 100) {
  return read(
    `MATCH (rel:Release)
     RETURN rel { .* } AS release
     ORDER BY coalesce(rel.date, ''), rel.title
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => rec.get("release")
  );
}

export async function getRelease(mbid: string) {
  const rows = await read(
    `MATCH (rel:Release {mbid: $mbid})
     OPTIONAL MATCH (rec:Recording)-[:APPEARS_ON]->(rel)
     OPTIONAL MATCH (rel)-[:RELEASED_BY]->(l:Label)
     OPTIONAL MATCH (rec)<-[:PERFORMED]-(a:Artist)
     RETURN rel { .* } AS release,
            collect(DISTINCT CASE WHEN rec IS NULL THEN null
              ELSE { mbid: rec.mbid, title: rec.title } END) AS recordings,
            collect(DISTINCT CASE WHEN l IS NULL THEN null
              ELSE { mbid: l.mbid, name: l.name } END) AS labels,
            collect(DISTINCT CASE WHEN a IS NULL THEN null
              ELSE { mbid: a.mbid, name: a.name } END) AS artists`,
    { mbid },
    (rec) => ({
      ...rec.get("release"),
      recordings: (rec.get("recordings") as unknown[]).filter(Boolean),
      labels: (rec.get("labels") as unknown[]).filter(Boolean),
      artists: (rec.get("artists") as unknown[]).filter(Boolean),
    })
  );
  return rows[0] ?? null;
}

// --- Graph (global) ---

export async function getCollaborationsGraph(limit = 150) {
  const edgeRows = await read(
    `MATCH (a:Artist)-[:COLLABORATED_WITH]-(b:Artist)
     WHERE a.mbid < b.mbid
     RETURN a.mbid AS source, a.name AS sourceName, b.mbid AS target, b.name AS targetName
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => ({
      source: rec.get("source"),
      sourceName: rec.get("sourceName"),
      target: rec.get("target"),
      targetName: rec.get("targetName"),
    })
  );
  const nodeMap = new Map<string, { id: string; label: string }>();
  const edges = edgeRows.map((e) => {
    nodeMap.set(e.source, { id: e.source, label: e.sourceName });
    nodeMap.set(e.target, { id: e.target, label: e.targetName });
    return { source: e.source, target: e.target };
  });
  return { nodes: [...nodeMap.values()], edges };
}

export async function getFullGraph(limit = 200) {
  const collab = await getCollaborationsGraph(limit);
  const artistRows = await read(
    `MATCH (a:Artist) RETURN a.mbid AS id, a.name AS label LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => ({ id: rec.get("id") as string, label: rec.get("label") as string })
  );
  const nodeMap = new Map(collab.nodes.map((n) => [n.id, n]));
  for (const n of artistRows) if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
  return { nodes: [...nodeMap.values()], edges: collab.edges };
}

// --- Stats ---

export async function statsOverview() {
  const rows = await read(
    `RETURN
       COUNT { (a:Artist) } AS artists,
       COUNT { (r:Recording) } AS recordings,
       COUNT { (rel:Release) } AS releases,
       COUNT { (g:Genre) } AS genres,
       COUNT { (l:Label) } AS labels,
       COUNT { ()-[c:COLLABORATED_WITH]->() } AS collaborations`,
    {},
    (rec) => ({
      artists: rec.get("artists"),
      recordings: rec.get("recordings"),
      releases: rec.get("releases"),
      genres: rec.get("genres"),
      labels: rec.get("labels"),
      collaborations: rec.get("collaborations"),
    })
  );
  return rows[0];
}

export async function topArtists(limit = 10) {
  return read(
    `MATCH (a:Artist)
     OPTIONAL MATCH (a)-[:COLLABORATED_WITH]-(c:Artist)
     OPTIONAL MATCH (a)-[:PERFORMED]->(r:Recording)
     RETURN a.mbid AS mbid, a.name AS name,
            count(DISTINCT c) AS collaborators, count(DISTINCT r) AS recordings
     ORDER BY collaborators DESC, recordings DESC, a.name
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => ({
      mbid: rec.get("mbid"),
      name: rec.get("name"),
      collaborators: rec.get("collaborators"),
      recordings: rec.get("recordings"),
    })
  );
}

export async function topCollaborations(limit = 10) {
  return read(
    `MATCH (a:Artist)-[:PERFORMED|FEATURED_ON]->(r:Recording)<-[:PERFORMED|FEATURED_ON]-(b:Artist)
     WHERE a.mbid < b.mbid
     RETURN a.mbid AS mbidA, a.name AS artistA, b.mbid AS mbidB, b.name AS artistB,
            count(DISTINCT r) AS sharedRecordings
     ORDER BY sharedRecordings DESC, artistA
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => ({
      mbidA: rec.get("mbidA"),
      artistA: rec.get("artistA"),
      mbidB: rec.get("mbidB"),
      artistB: rec.get("artistB"),
      sharedRecordings: rec.get("sharedRecordings"),
    })
  );
}

export async function topGenres(limit = 10) {
  return read(
    `MATCH (g:Genre)<-[:ASSOCIATED_WITH_GENRE]-(a:Artist)
     RETURN g.name AS genre, count(DISTINCT a) AS artists
     ORDER BY artists DESC, genre
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => ({ genre: rec.get("genre"), artists: rec.get("artists") })
  );
}

export async function topRecordings(limit = 10) {
  return read(
    `MATCH (r:Recording)<-[:PERFORMED|FEATURED_ON]-(a:Artist)
     RETURN r.mbid AS mbid, r.title AS title, count(DISTINCT a) AS artistCount
     ORDER BY artistCount DESC, r.title
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
    (rec) => ({ mbid: rec.get("mbid"), title: rec.get("title"), artistCount: rec.get("artistCount") })
  );
}
