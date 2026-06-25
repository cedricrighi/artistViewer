import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getDriver, closeDriver } from "./neo4j.js";

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

const server = app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

process.on("SIGTERM", async () => {
  await closeDriver();
  server.close();
});
