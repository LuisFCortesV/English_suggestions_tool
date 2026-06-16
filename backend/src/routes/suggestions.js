import { Router } from "express";
import { MAX_PHRASE_LENGTH } from "../config.js";
import { HttpError } from "../httpError.js";

// Factory so tests can inject a fake generateSuggestions (Principle III).
export function createSuggestionsRouter(generateSuggestions) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const rawPhrase = typeof req.body?.phrase === "string" ? req.body.phrase : "";
      const phrase = rawPhrase.trim();

      if (phrase.length === 0) {
        throw new HttpError(
          400,
          "EMPTY_PHRASE",
          "Por favor escribe una palabra o frase para recibir sugerencias.",
        );
      }
      if (phrase.length > MAX_PHRASE_LENGTH) {
        throw new HttpError(
          400,
          "PHRASE_TOO_LONG",
          `La frase es demasiado larga (máximo ${MAX_PHRASE_LENGTH} caracteres).`,
        );
      }

      const rawContext = typeof req.body?.context === "string" ? req.body.context : "";
      const context = rawContext.trim() || undefined;

      const result = await generateSuggestions(phrase, context);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
