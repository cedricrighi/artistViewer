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
