import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getDriver, closeDriver } from "./neo4j.js";
import { searchArtists, lookupArtist, fetchReleasesForArtist } from "./musicbrainz.js";
import { upsertArtist } from "./artists.js";
import { importRecordingsForArtist } from "./recordings.js";

dotenv.config();

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health/neo4j", async (_req, res) => {
  try {
    await getDriver().verifyConnectivity();
    res.json({ status: "ok" });
  } catch (error) {
    res.status(503).json({ status: "error", message: (error as Error).message });
  }
});

app.get("/api/search/artists", async (req, res) => {
  const query = req.query.q;
  if (typeof query !== "string" || query.trim() === "") {
    res.status(400).json({ message: "Query parameter 'q' is required" });
    return;
  }
  try {
    const artists = await searchArtists(query);
    res.json(artists);
  } catch (error) {
    res.status(502).json({ message: (error as Error).message });
  }
});

app.post("/api/import/artists", async (req, res) => {
  const mbid = req.body?.mbid;
  if (typeof mbid !== "string" || mbid.trim() === "") {
    res.status(400).json({ message: "Body field 'mbid' is required" });
    return;
  }
  try {
    const artist = await lookupArtist(mbid);
    await upsertArtist(artist);
    res.status(201).json({ status: "imported", mbid: artist.id });
  } catch (error) {
    res.status(502).json({ message: (error as Error).message });
  }
});

app.post("/api/import/recordings", async (req, res) => {
  const mbid = req.body?.mbid;
  if (typeof mbid !== "string" || mbid.trim() === "") {
    res.status(400).json({ message: "Body field 'mbid' is required" });
    return;
  }
  try {
    const releases = await fetchReleasesForArtist(mbid);
    const { recordings } = await importRecordingsForArtist(mbid, releases);
    res.status(201).json({ status: "imported", mbid, releases: releases.length, recordings });
  } catch (error) {
    res.status(502).json({ message: (error as Error).message });
  }
});

const server = app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

process.on("SIGTERM", async () => {
  await closeDriver();
  server.close();
});
