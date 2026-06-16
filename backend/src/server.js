import "dotenv/config";
import { createApp } from "./app.js";
import { getConfig } from "./config.js";

const { apiKey, port } = getConfig();

if (!apiKey) {
  console.error(
    "[fatal] GEMINI_API_KEY no está configurada. Copia backend/.env.example a backend/.env y agrega tu clave.",
  );
  process.exit(1);
}

const app = createApp();
app.listen(port, () => {
  console.log(`English Register Suggestions escuchando en http://localhost:${port}`);
});
