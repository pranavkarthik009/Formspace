import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, "..");
const storageDir = path.resolve(process.env.MODEL_STORAGE_DIR || path.join(projectDir, "data"));
const modelsDir = path.join(storageDir, "models");
const metadataDir = path.join(storageDir, "metadata");
const app = express();
const port = Number(process.env.PORT || 3001);

await fs.mkdir(modelsDir, { recursive: true });
await fs.mkdir(metadataDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.post("/api/models", upload.single("file"), async (request, response, next) => {
  try {
    const file = request.file;
    if (!file) return response.status(400).json({ error: "Choose a model file to upload." });
    const originalName = typeof request.body.originalName === "string" ? request.body.originalName : file.originalname;
    if (originalName.length > 180) {
      return response.status(400).json({ error: "The file name is too long." });
    }
    const extension = path.extname(originalName).toLowerCase();
    if (![".glb", ".gltf", ".stl", ".obj", ".fbx"].includes(extension)) {
      return response.status(400).json({ error: "That file type isn't supported." });
    }
    if (file.buffer.length < 12 || file.buffer.toString("ascii", 0, 4) !== "glTF") {
      return response.status(400).json({ error: "The uploaded model couldn't be prepared. Please try a different file." });
    }

    const id = crypto.randomUUID();
    const format = extension.slice(1);
    const units = ["mm", "cm", "m"].includes(request.body.units) ? request.body.units : "mm";
    const record = {
      id,
      name: path.basename(originalName, extension).slice(0, 120) || "Untitled model",
      format,
      size: file.size,
      units,
      createdAt: new Date().toISOString(),
      fileUrl: `/api/models/${id}/file`,
    };

    await fs.writeFile(path.join(modelsDir, `${id}.glb`), file.buffer, { flag: "wx" });
    try {
      await fs.writeFile(path.join(metadataDir, `${id}.json`), JSON.stringify(record), { flag: "wx" });
    } catch (error) {
      await fs.rm(path.join(modelsDir, `${id}.glb`), { force: true });
      throw error;
    }
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.get("/api/models/:id", async (request, response, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(request.params.id)) {
      return response.status(404).json({ error: "This model link is unavailable." });
    }
    const record = JSON.parse(await fs.readFile(path.join(metadataDir, `${request.params.id}.json`), "utf8"));
    response.json(record);
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) {
      return response.status(404).json({ error: "This model link is unavailable." });
    }
    next(error);
  }
});

app.get("/api/models/:id/file", async (request, response, next) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(request.params.id)) {
      return response.status(404).json({ error: "This model file is unavailable." });
    }
    const modelPath = path.join(modelsDir, `${request.params.id}.glb`);
    await fs.access(modelPath);
    response.type("model/gltf-binary").sendFile(modelPath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return response.status(404).json({ error: "This model file is unavailable." });
    }
    next(error);
  }
});

const clientDist = path.join(projectDir, "dist");
try {
  await fs.access(clientDist);
  app.use(express.static(clientDist));
  app.get("*path", (_request, response) => response.sendFile(path.join(clientDist, "index.html")));
} catch {
  // Vite serves the client separately during development.
}

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "The maximum file size is 100 MB." : "Couldn't process that upload.";
    return response.status(400).json({ error: message });
  }
  console.error("Request failed:", error);
  response.status(500).json({ error: "Something went wrong while processing your request." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Formspace API listening on http://localhost:${port}`);
  console.log(`Local network addresses: ${Object.values(os.networkInterfaces()).flat().filter((address) => address?.family === "IPv4" && !address.internal).map((address) => `http://${address.address}:${port}`).join(", ") || "none detected"}`);
});
