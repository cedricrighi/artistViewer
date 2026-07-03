import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | undefined;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI ?? "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER ?? "neo4j",
        process.env.NEO4J_PASSWORD ?? "changeme"
      ),
      // Return integers as plain JS numbers (track lengths, counts) instead of
      // neo4j Integer objects, which keeps the read queries' JSON clean.
      { disableLosslessIntegers: true }
    );
  }
  return driver;
}

export async function closeDriver(): Promise<void> {
  await driver?.close();
}

// One constraint per merge key: guarantees MBID uniqueness at the database
// level (MERGE alone doesn't protect against concurrent writes) and creates
// the backing indexes used by every lookup.
const CONSTRAINTS = [
  "CREATE CONSTRAINT artist_mbid IF NOT EXISTS FOR (a:Artist) REQUIRE a.mbid IS UNIQUE",
  "CREATE CONSTRAINT recording_mbid IF NOT EXISTS FOR (r:Recording) REQUIRE r.mbid IS UNIQUE",
  "CREATE CONSTRAINT release_mbid IF NOT EXISTS FOR (r:Release) REQUIRE r.mbid IS UNIQUE",
  "CREATE CONSTRAINT label_mbid IF NOT EXISTS FOR (l:Label) REQUIRE l.mbid IS UNIQUE",
  "CREATE CONSTRAINT genre_name IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE",
  "CREATE CONSTRAINT area_mbid IF NOT EXISTS FOR (a:Area) REQUIRE a.mbid IS UNIQUE",
];

// Neo4j can still be booting when the backend starts (compose `depends_on`
// doesn't wait for readiness), so retry a few times before giving up.
export async function ensureConstraints(retries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const session = getDriver().session();
    try {
      for (const cypher of CONSTRAINTS) await session.run(cypher);
      console.log("Neo4j uniqueness constraints ensured");
      return;
    } catch (error) {
      if (attempt === retries) {
        console.error("Could not create Neo4j constraints, continuing without them:", error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } finally {
      await session.close();
    }
  }
}
