# Data Model: English Register Suggestions

**Date**: 2026-06-12 | **Plan**: [plan.md](./plan.md)

No persistence — these are in-memory/wire shapes only. The same shapes flow
frontend → backend (request) and LLM module → backend → frontend (response).

## SuggestionRequest

The user's submission. Lives only for the duration of one HTTP request.

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `phrase` | string | yes | After trimming: non-empty (else `EMPTY_PHRASE`), ≤300 characters (else `PHRASE_TOO_LONG`). May be English, Spanish, or mixed (FR-015). |
| `context` | string | no | Optional audience/situation description; trimmed; ≤300 characters; empty string treated as absent. |

Validation happens in the route (`backend/src/routes/suggestions.js`) before
the LLM module is invoked (FR-011); invalid requests never reach Gemini.

## Suggestion

One generated alternative.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `register` | enum: `formal` \| `neutral` \| `informal` | yes | Labels the register (FR-008). |
| `text` | string | yes | The suggested phrase, in English; non-empty. This is what the copy action copies (FR-009). |
| `explanation` | string | yes | Brief explanation in Spanish of what makes it natural in that register and how it differs from the original (FR-008). |
| `isAlreadyOptimal` | boolean | no | Only meaningful on the `formal` suggestion. `true` when the formal suggestion is identical (or effectively identical) to the user's original phrase — i.e., the original is already the most formal/standard form possible (FR-016). The frontend shows a green "already optimal" indicator when `true`. Defaults to `false`; absent or `false` means no indicator. Always `false`/absent for `neutral` and `informal`. |

## SuggestionSet

The response to one request — what `generateSuggestions(phrase, context)`
returns and what the API sends to the frontend.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `suggestions` | Suggestion[] | yes | 1–3 items. MUST contain exactly one `formal` suggestion (FR-004). Contains at most one `neutral` and at most one `informal`, present only when meaningfully distinct (FR-005/006); absent registers are simply omitted (FR-007). Order: formal, neutral, informal. |
| `wasSpanishInput` | boolean | yes | `true` when the input phrase was Spanish or mixed; the frontend then shows the fixed Spanish encouragement note (FR-015). `false` for English input — note suppressed. |

**Invariant enforced at the LLM-module boundary** (`geminiClient.js`
validation, per Principle II): a response missing the formal suggestion, with
duplicate registers, with an unknown register value, or with empty
`text`/`explanation` is rejected as malformed → typed error →
`GENERATION_FAILED` to the client. Partial/invalid data never reaches the
frontend.

## Error shape (all API errors)

| Field | Type | Rules |
|-------|------|-------|
| `error.code` | string | One of: `EMPTY_PHRASE`, `PHRASE_TOO_LONG`, `GENERATION_TIMEOUT`, `GENERATION_FAILED`. |
| `error.message` | string | Human-readable, in Spanish, actionable (FR-012/FR-011). Never contains stack traces or provider payloads. |

See [contracts/api.md](./contracts/api.md) for status-code mapping and
examples.
