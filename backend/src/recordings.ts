import { getDriver } from "./neo4j.js";
import type { MusicBrainzRelease } from "./musicbrainz.js";

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
    labels: { mbid: string; name: string }[];
    area: { mbid: string; name: string; type: string | null } | null;
  }[];
  collaborators: { id: string; name: string }[];
}

// Flatten the releases-first payload into one entry per (recording, release).
// We keep only recordings actually credited to the imported artist so that
// PERFORMED stays accurate; co-credited artists become collaborators.
function flattenReleases(releases: MusicBrainzRelease[], artistMbid: string): RecordingParam[] {
  const params: RecordingParam[] = [];
  for (const release of releases) {
    const eventArea = (release["release-events"] ?? []).find((e) => e.area?.id)?.area ?? null;
    const releaseInfo = {
      area: eventArea
        ? { mbid: eventArea.id, name: eventArea.name, type: eventArea.type ?? null }
        : null,
      mbid: release.id,
      title: release.title,
      date: release.date ?? null,
      country: release.country ?? null,
      status: release.status ?? null,
      releaseType: release["release-group"]?.["primary-type"] ?? null,
      labels: (release["label-info"] ?? [])
        .map((info) => info.label)
        .filter((label): label is { id: string; name: string } => Boolean(label?.id))
        .map((label) => ({ mbid: label.id, name: label.name })),
    };
    for (const medium of release.media ?? []) {
      for (const track of medium.tracks ?? []) {
        const recording = track.recording;
        const credits = recording["artist-credit"] ?? [];
        const performed = credits.some((credit) => credit.artist.id === artistMbid);
        if (!performed) continue;
        params.push({
          mbid: recording.id,
          title: recording.title,
          length: recording.length ?? null,
          firstReleaseDate: recording["first-release-date"] ?? null,
          releases: [releaseInfo],
          collaborators: credits
            .map((credit) => credit.artist)
            .filter((artist) => artist.id !== artistMbid),
        });
      }
    }
  }
  return params;
}

export async function importRecordingsForArtist(
  artistMbid: string,
  releases: MusicBrainzRelease[]
): Promise<{ recordings: number }> {
  const recordingParams = flattenReleases(releases, artistMbid);
  const session = getDriver().session();
  try {
    await session.run(
      `MATCH (artist:Artist {mbid: $artistMbid})
       UNWIND $recordings AS rec
       MERGE (recording:Recording {mbid: rec.mbid})
       SET recording.title = rec.title,
           recording.length = rec.length,
           recording.firstReleaseDate = rec.firstReleaseDate,
           recording.source = 'musicbrainz'
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
         WITH release, rel
         CALL {
           WITH release, rel
           UNWIND rel.labels AS lab
           MERGE (label:Label {mbid: lab.mbid})
           SET label.name = lab.name
           MERGE (release)-[:RELEASED_BY]->(label)
         }
         CALL {
           WITH release, rel
           WITH release, rel WHERE rel.area IS NOT NULL
           MERGE (area:Area {mbid: rel.area.mbid})
           SET area.name = rel.area.name,
               area.type = coalesce(rel.area.type, area.type)
           MERGE (release)-[:RELEASED_IN]->(area)
         }
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
        recordings: recordingParams,
      }
    );
    return { recordings: recordingParams.length };
  } finally {
    await session.close();
  }
}
