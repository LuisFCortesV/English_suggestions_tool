import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSuggestions as defaultGenerateSuggestions } from "./llm/index.js";
import { createSuggestionsRouter } from "./routes/suggestions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");

// Builds the Express app. `generateSuggestions` is injectable for tests.
export function createApp({ generateSuggestions = defaultGenerateSuggestions } = {}) {
  const app = express();

  app.use(express.json({ limit: "16kb" }));

  app.use("/api/suggestions", createSuggestionsRouter(generateSuggestions));

  // Static frontend served at the root.
  app.use(express.static(FRONTEND_DIR));

  // Centralized error handler -> documented shape { error: { code, message } }.
  // Internal cause is logged server-side only, never sent to the client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const code = err.code || "INTERNAL";
    const message = err.userMessage || "Ocurrió un error inesperado.";
    console.error(
      `[error] code=${code} status=${status} path=${req.path}`,
      err.cause || err.stack || err.message,
    );
    res.status(status).json({ error: { code, message } });
  });

  return app;
}
