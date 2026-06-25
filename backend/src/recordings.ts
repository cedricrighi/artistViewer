import { getDriver } from "./neo4j.js";
import type { MusicBrainzRecording } from "./musicbrainz.js";

interface RecordingParam {
  mbid: string;
  title: string;
  length: number | null;
  firstReleaseDate: string | null;
  releases: {
    mbid: string;
    title: string;
    date: string | null;
    country: string | null;
    status: string | null;
    releaseType: string | null;
  }[];
  collaborators: { id: string; name: string }[];
}

function toParam(recording: MusicBrainzRecording, artistMbid: string): RecordingParam {
  return {
    mbid: recording.id,
    title: recording.title,
    length: recording.length ?? null,
    firstReleaseDate: recording["first-release-date"] ?? null,
    releases: (recording.releases ?? []).map((release) => ({
      mbid: release.id,
      title: release.title,
      date: release.date ?? null,
      country: release.country ?? null,
      status: release.status ?? null,
      releaseType: release["release-group"]?.["primary-type"] ?? null,
    })),
    collaborators: (recording["artist-credit"] ?? [])
      .map((credit) => credit.artist)
      .filter((artist) => artist.id !== artistMbid),
  };
}

export async function importRecordingsForArtist(
  artistMbid: string,
  recordings: MusicBrainzRecording[]
): Promise<void> {
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (artist:Artist {mbid: $artistMbid})
       UNWIND $recordings AS rec
       MERGE (recording:Recording {mbid: rec.mbid})
       SET recording.title = rec.title,
           recording.length = rec.length,
           recording.firstReleaseDate = rec.firstReleaseDate
       MERGE (artist)-[:PERFORMED]->(recording)
       WITH artist, recording, rec
       CALL {
         WITH recording, rec
         UNWIND rec.releases AS rel
         MERGE (release:Release {mbid: rel.mbid})
         SET release.title = rel.title,
             release.date = rel.date,
             release.country = rel.country,
             release.status = rel.status,
             release.releaseType = rel.releaseType
         MERGE (recording)-[:APPEARS_ON]->(release)
       }
       WITH artist, recording, rec
       CALL {
         WITH artist, recording, rec
         UNWIND rec.collaborators AS collab
         MERGE (other:Artist {mbid: collab.id})
         ON CREATE SET other.name = collab.name
         MERGE (other)-[:FEATURED_ON]->(recording)
         MERGE (artist)-[:COLLABORATED_WITH]->(other)
       }`,
      {
        artistMbid,
        recordings: recordings.map((recording) => toParam(recording, artistMbid)),
      }
    );
  } finally {
    await session.close();
  }
}
