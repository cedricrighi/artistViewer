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
           a.endDate = $endDate`,
      {
        mbid: artist.id,
        name: artist.name,
        type: artist.type ?? null,
        country: artist.country ?? null,
        disambiguation: artist.disambiguation ?? null,
        beginDate: artist["life-span"]?.begin ?? null,
        endDate: artist["life-span"]?.end ?? null,
      }
    );
  } finally {
    await session.close();
  }
}
