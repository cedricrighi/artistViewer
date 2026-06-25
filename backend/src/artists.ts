import { getDriver } from "./neo4j.js";
import type { MusicBrainzArtist } from "./musicbrainz.js";

export async function upsertArtist(artist: MusicBrainzArtist): Promise<void> {
  const session = getDriver().session();
  try {
    await session.run(
      `MERGE (a:Artist {mbid: $mbid})
       SET a.name = $name,
           a.type = $type,
           a.country = $country,
           a.disambiguation = $disambiguation,
           a.beginDate = $beginDate,
           a.endDate = $endDate
       WITH a
       CALL {
         WITH a
         WITH a WHERE $area IS NOT NULL
         MERGE (area:Area {mbid: $area.mbid})
         SET area.name = $area.name, area.type = $area.type
         MERGE (a)-[:FROM_AREA]->(area)
       }
       CALL {
         WITH a
         UNWIND $genres AS g
         MERGE (genre:Genre {name: g.name})
         MERGE (a)-[:ASSOCIATED_WITH_GENRE]->(genre)
       }`,
      {
        mbid: artist.id,
        name: artist.name,
        type: artist.type ?? null,
        country: artist.country ?? null,
        disambiguation: artist.disambiguation ?? null,
        beginDate: artist["life-span"]?.begin ?? null,
        endDate: artist["life-span"]?.end ?? null,
        area: artist.area
          ? { mbid: artist.area.id, name: artist.area.name, type: artist.area.type ?? null }
          : null,
        genres: (artist.genres ?? []).map((g) => ({ name: g.name })),
      }
    );
  } finally {
    await session.close();
  }
}
