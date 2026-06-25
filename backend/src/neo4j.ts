import neo4j, { Driver } from "neo4j-driver";

let driver: Driver | undefined;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI ?? "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER ?? "neo4j",
        process.env.NEO4J_PASSWORD ?? "changeme"
      )
    );
  }
  return driver;
}

export async function closeDriver(): Promise<void> {
  await driver?.close();
}
