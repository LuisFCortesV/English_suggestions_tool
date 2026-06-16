# API Contract: English Register Suggestions

**Date**: 2026-06-12 | **Plan**: [plan.md](../plan.md) | **Shapes**: [data-model.md](../data-model.md)

This is the **only** contract between `frontend/` and `backend/`. It is
provider-agnostic: nothing in it references Gemini, models, or prompts
(Constitution Principle III). The frontend MUST NOT depend on anything not
documented here.

## Constants

These values are part of the contract. Both layers MUST derive their behavior
from this single source rather than hardcoding the literal independently
(prevents the kind of drift that already occurred once: 500 vs 300).

| Name | Value | Meaning |
|------|-------|---------|
| `MAX_PHRASE_LENGTH` | 300 | Maximum allowed length of `phrase` (characters, after trimming). The backend is the authority and enforces it; the frontend reads the same value for its pre-submit validation message. |

## POST /api/suggestions

Generates register-labeled English suggestions for a phrase.

### Request

- Content-Type: `application/json`

```json
{
  "phrase": "I want to know if you can come to the meeting",
  "context": "correo formal a mi jefe"
}
```

- `phrase` (string, required): the word or phrase to improve. Trimmed
  server-side; must be non-empty and ≤`MAX_PHRASE_LENGTH` chars after
  trimming (see Constants).
- `context` (string, optional): audience/situation. Omitted, empty, or
  whitespace-only is treated as no context.

### Success response — 200

```json
{
  "suggestions": [
    {
      "register": "formal",
      "text": "I would like to know whether you will be able to attend the meeting.",
      "explanation": "Esta es la forma estándar y formal preferida en inglés británico; 'whether' y 'attend' son más apropiados en un correo formal.",
      "isAlreadyOptimal": false
    },
    {
      "register": "neutral",
      "text": "Could you let me know if you can make it to the meeting?",
      "explanation": "Así lo diría un hablante nativo en una conversación normal de trabajo."
    },
    {
      "register": "informal",
      "text": "Hey, can you make the meeting?",
      "explanation": "Versión casual entre amigos o colegas de confianza."
    }
  ],
  "wasSpanishInput": false
}
```

Guarantees (the frontend may rely on these):

- `suggestions` has 1–3 items, ordered formal → neutral → informal.
- Exactly one item has `register: "formal"` — always present (FR-004).
- `neutral`/`informal` items appear only when they add a distinct natural
  variant; when absent they are simply missing from the array (FR-005–007).
  The frontend renders only what it receives — no placeholders.
- Every item has non-empty `text` (English) and `explanation` (Spanish).
- The `formal` item carries an `isAlreadyOptimal` boolean. When `true`, the
  formal suggestion is identical (or effectively identical) to the user's
  original phrase and the frontend shows a green "ya es la forma más formal"
  indicator on the first line of that card (FR-016). When `false` or absent,
  no indicator is shown. `neutral`/`informal` items always have it `false` or
  absent.
- `wasSpanishInput: true` → frontend shows the fixed encouragement note in
  Spanish ("Intenta escribir tu frase en inglés la próxima vez…"); `false` →
  no note (FR-015).

### Error responses

All errors share the shape `{ "error": { "code": "...", "message": "..." } }`
with `message` in Spanish and safe to display verbatim.

| Status | `error.code` | When | Example `message` |
|--------|--------------|------|-------------------|
| 400 | `EMPTY_PHRASE` | `phrase` missing, empty, or whitespace-only | "Por favor escribe una palabra o frase para recibir sugerencias." |
| 400 | `PHRASE_TOO_LONG` | `phrase` > `MAX_PHRASE_LENGTH` chars after trim | "La frase es demasiado larga (máximo 300 caracteres)." |
| 504 | `GENERATION_TIMEOUT` | Generation exceeded 15 seconds | "La generación tardó demasiado. Por favor intenta de nuevo." |
| 502 | `GENERATION_FAILED` | Provider error, outage, rate limit, or invalid/malformed generation result | "No pudimos generar sugerencias en este momento. Por favor intenta de nuevo." |

Notes:

- Validation (400s) happens before any generation call — no cost incurred.
- Provider details (stack traces, raw payloads, provider error codes) are
  logged server-side only and never included in responses (FR-012,
  Principle II).
- No authentication, no API key, no rate limiting in v1 (per clarification).

## GET / (static frontend)

Express serves `frontend/` statically at the root (`index.html`,
`styles.css`, `app.js`). No other endpoints exist in v1.

## Internal interface (backend-internal, not exposed)

Documented for testability (Principle III), not part of the public API:

```text
generateSuggestions(phrase: string, context?: string) → Promise<SuggestionSet>
  throws GenerationTimeoutError | GenerationFailedError
```

`backend/src/routes/suggestions.js` depends only on this function; tests mock
it to exercise route behavior without the provider.
