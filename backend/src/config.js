// Single source of truth for values shared across layers.
// MAX_PHRASE_LENGTH is documented in specs/.../contracts/api.md (Constants);
// the backend is the authority that enforces it. The frontend references the
// same documented value — never hardcode the literal separately per layer.
export const MAX_PHRASE_LENGTH = 300;

// Hard timeout for a single generation call (FR-012).
export const GENERATION_TIMEOUT_MS = 15000;

export function getConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY,
    port: Number(process.env.PORT) || 3000,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  };
}
