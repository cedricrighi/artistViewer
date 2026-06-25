import { writeFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { getDriver, closeDriver } from "../neo4j.js";

dotenv.config();

// Dump the whole MusicGraph (nodes + relationships) to a JSON file so the
// dataset can be inspected or re-loaded. Run with: npm run export:data
async function main() {
  const session = getDriver().session({ defaultAccessMode: "READ" });
  try {
    const nodesResult = await session.run(
      `MATCH (n)
       RETURN labels(n)[0] AS label, properties(n) AS props
       ORDER BY label`
    );
    const relsResult = await session.run(
      `MATCH (a)-[r]->(b)
       RETURN type(r) AS type,
              coalesce(a.mbid, a.name) AS source,
              coalesce(b.mbid, b.name) AS target`
    );

    const nodes = nodesResult.records.map((rec) => ({
      label: rec.get("label"),
      properties: rec.get("props"),
    }));
    const relationships = relsResult.records.map((rec) => ({
      type: rec.get("type"),
      source: rec.get("source"),
      target: rec.get("target"),
    }));

    const dataset = {
      exportedAt: new Date().toISOString(),
      counts: { nodes: nodes.length, relationships: relationships.length },
      nodes,
      relationships,
    };

    const outPath = path.resolve(process.cwd(), "../data/dataset.json");
    await writeFile(outPath, JSON.stringify(dataset, null, 2), "utf-8");
    console.log(`Exported ${nodes.length} nodes and ${relationships.length} relationships to ${outPath}`);
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
