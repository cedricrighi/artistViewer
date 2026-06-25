import { getDriver } from "./neo4j.js";

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
