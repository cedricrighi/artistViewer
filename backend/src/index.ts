import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getDriver, closeDriver } from "./neo4j.js";
import { searchArtists, lookupArtist, fetchReleasesForArtist } from "./musicbrainz.js";
import { upsertArtist } from "./artists.js";
import { importRecordingsForArtist } from "./recordings.js";
import {
  listArtists,
  getArtist,
  getArtistRecordings,
  getArtistReleases,
  getArtistCollaborations,
  getArtistGraph,
  listRecordings,
  getRecording,
  listReleases,
  getRelease,
  getFullGraph,
  getCollaborationsGraph,
  statsOverview,
  topArtists,
  topCollaborations,
  topGenres,
  topRecordings,
} from "./queries.js";

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
    console.error("[GET /api/search/artists] failed:", error);
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
    console.error(`[POST /api/import/artists] failed for mbid=${mbid}:`, error);
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
    console.error(`[POST /api/import/recordings] failed for mbid=${mbid}:`, error);
    res.status(502).json({ message: (error as Error).message });
  }
});

app.get("/api/artists", async (_req, res) => {
  try {
    res.json(await listArtists());
  } catch (error) {
    console.error("[GET /api/artists] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/artists/:id", async (req, res) => {
  try {
    const artist = await getArtist(req.params.id);
    if (!artist) {
      res.status(404).json({ message: "Artist not found" });
      return;
    }
    res.json(artist);
  } catch (error) {
    console.error(`[GET /api/artists/${req.params.id}] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/artists/:id/recordings", async (req, res) => {
  try {
    res.json(await getArtistRecordings(req.params.id));
  } catch (error) {
    console.error(`[GET /api/artists/${req.params.id}/recordings] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/artists/:id/releases", async (req, res) => {
  try {
    res.json(await getArtistReleases(req.params.id));
  } catch (error) {
    console.error(`[GET /api/artists/${req.params.id}/releases] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/artists/:id/collaborations", async (req, res) => {
  try {
    res.json(await getArtistCollaborations(req.params.id));
  } catch (error) {
    console.error(`[GET /api/artists/${req.params.id}/collaborations] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/graph/artists/:id", async (req, res) => {
  try {
    const graph = await getArtistGraph(req.params.id);
    if (!graph) {
      res.status(404).json({ message: "Artist not found" });
      return;
    }
    res.json(graph);
  } catch (error) {
    console.error(`[GET /api/graph/artists/${req.params.id}] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

function parseLimit(req: express.Request, fallback: number): number {
  const raw = Number(req.query.limit);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

app.get("/api/recordings", async (req, res) => {
  try {
    res.json(await listRecordings(parseLimit(req, 100)));
  } catch (error) {
    console.error("[GET /api/recordings] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/recordings/:id", async (req, res) => {
  try {
    const recording = await getRecording(req.params.id);
    if (!recording) {
      res.status(404).json({ message: "Recording not found" });
      return;
    }
    res.json(recording);
  } catch (error) {
    console.error(`[GET /api/recordings/${req.params.id}] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/releases", async (req, res) => {
  try {
    res.json(await listReleases(parseLimit(req, 100)));
  } catch (error) {
    console.error("[GET /api/releases] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/releases/:id", async (req, res) => {
  try {
    const release = await getRelease(req.params.id);
    if (!release) {
      res.status(404).json({ message: "Release not found" });
      return;
    }
    res.json(release);
  } catch (error) {
    console.error(`[GET /api/releases/${req.params.id}] failed:`, error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/graph", async (req, res) => {
  try {
    res.json(await getFullGraph(parseLimit(req, 200)));
  } catch (error) {
    console.error("[GET /api/graph] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/graph/collaborations", async (req, res) => {
  try {
    res.json(await getCollaborationsGraph(parseLimit(req, 150)));
  } catch (error) {
    console.error("[GET /api/graph/collaborations] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/stats/overview", async (_req, res) => {
  try {
    res.json(await statsOverview());
  } catch (error) {
    console.error("[GET /api/stats/overview] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/stats/top-artists", async (req, res) => {
  try {
    res.json(await topArtists(parseLimit(req, 10)));
  } catch (error) {
    console.error("[GET /api/stats/top-artists] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/stats/top-collaborations", async (req, res) => {
  try {
    res.json(await topCollaborations(parseLimit(req, 10)));
  } catch (error) {
    console.error("[GET /api/stats/top-collaborations] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/stats/top-genres", async (req, res) => {
  try {
    res.json(await topGenres(parseLimit(req, 10)));
  } catch (error) {
    console.error("[GET /api/stats/top-genres] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

app.get("/api/stats/top-recordings", async (req, res) => {
  try {
    res.json(await topRecordings(parseLimit(req, 10)));
  } catch (error) {
    console.error("[GET /api/stats/top-recordings] failed:", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

const server = app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

process.on("SIGTERM", async () => {
  await closeDriver();
  server.close();
});
