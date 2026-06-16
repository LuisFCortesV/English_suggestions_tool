# Research: English Register Suggestions

**Date**: 2026-06-12 | **Plan**: [plan.md](./plan.md)

No NEEDS CLARIFICATION markers remained in the Technical Context (the stack
was fully specified by the user). Research below records the concrete choices
within that stack and their rationale.

## R1: Gemini SDK and invocation pattern

- **Decision**: Use the official `@google/genai` JavaScript SDK from the
  backend, called once per user request (single-turn `generateContent`, no
  chat session, no streaming).
- **Rationale**: `@google/genai` is Google's current, supported SDK (the
  older `@google/generative-ai` package is deprecated). One request → one
  structured response matches the feature exactly; streaming adds frontend
  complexity (Principle I) for little benefit on a ≤10s response.
- **Alternatives considered**: Raw REST calls to the Gemini API (more code to
  maintain for auth/retries, no benefit); deprecated `@google/generative-ai`
  SDK (rejected: deprecated); streaming responses (rejected: complexity
  without UX need at this latency).

## R2: Getting structured suggestions out of Gemini

- **Decision**: Use Gemini's structured output: set
  `responseMimeType: "application/json"` with a `responseSchema` describing
  `{ suggestions: [{ register, text, explanation }], wasSpanishInput }`,
  where `register` is an enum (`formal | neutral | informal`). The LLM module
  still validates the parsed JSON (formal present, valid registers, non-empty
  strings) before returning it, and throws a typed error if invalid.
- **Rationale**: `responseSchema` makes malformed output rare; validation in
  `geminiClient.js` enforces Principle II (handle malformed responses
  explicitly) and guarantees FR-004 (formal always present) at the boundary.
  Letting the model decide whether neutral/informal variants add value
  (FR-005/006) and whether the input was Spanish (FR-015) keeps that judgment
  in the prompt, where it belongs.
- **Alternatives considered**: Free-text response parsed with regex/markers
  (fragile, violates Principle II); three separate Gemini calls per register
  (3× cost and latency, and cannot compare variants for distinctness).

## R3: Model selection

- **Decision**: Default to `gemini-2.5-flash`, overridable via the
  `GEMINI_MODEL` environment variable.
- **Rationale**: Flash-tier models comfortably handle short rephrasing tasks
  within the 10s target at low cost; an env override lets the model be
  upgraded without a code change (supports Principle III: model selection is
  an LLM-module concern, configured not hardcoded).
- **Alternatives considered**: Pro-tier models (higher latency and cost,
  unneeded quality margin for short phrases); hardcoding the model name
  (rejected: forces a deploy for a config change).

## R4: Timeout and failure mapping (FR-012)

- **Decision**: Enforce the 15s limit in `geminiClient.js` with an
  `AbortController`; map failures to typed errors the route translates into
  the documented error shape: `GENERATION_TIMEOUT` (504),
  `GENERATION_FAILED` (502, covers provider errors/outage/rate limits and
  invalid responses after validation). All user-facing messages in Spanish;
  underlying cause logged server-side with context (operation, input length,
  cause), never sent to the client.
- **Rationale**: One timeout enforced at the LLM boundary keeps the route
  simple; two user-distinguishable failure codes are all the frontend needs
  ("tardó demasiado" vs "falló — intenta de nuevo"). Finer-grained provider
  codes would leak provider semantics across the boundary (Principle III).
- **Alternatives considered**: Express-level request timeout middleware
  (wrong layer — the LLM call is what needs bounding); automatic retry on
  failure (rejected for v1: doubles worst-case latency past the 15s budget;
  the user can retry manually per FR-012).

## R5: Frontend approach (vanilla, Spanish UI)

- **Decision**: One static page (`index.html` + `styles.css` + `app.js`)
  served by the same Express app. `fetch` posts to `/api/suggestions`;
  rendering uses `document.createElement`/`textContent` (no `innerHTML` with
  response data, avoiding XSS from generated text). Copy uses
  `navigator.clipboard.writeText` with a brief "Copiado" confirmation
  (FR-009). Button disabled while a request is in flight (FR-013). All
  labels/messages in Spanish (FR-014), defined as constants in `app.js`.
- **Rationale**: Matches the user's explicit no-framework constraint and
  Principle I; same-origin serving avoids CORS configuration entirely.
- **Alternatives considered**: Separate static host + CORS (extra config, no
  benefit in v1); `execCommand('copy')` fallback (deprecated; target browsers
  support the async clipboard API).

## R6: Testing strategy

- **Decision**: Node's built-in `node:test` runner. Two suites:
  (1) `llm.test.js` — prompt assembly and response validation with the Gemini
  SDK mocked; (2) `suggestions.test.js` — route behavior via `supertest` with
  `llm/index.js` mocked: empty/too-long input → 400, LLM timeout → 504, LLM
  failure → 502, success shape, formal-always-present invariant. Error-path
  tests are mandatory per the constitution's quality gates.
- **Rationale**: Built-in runner means zero test-framework dependencies
  (Principle I); mocking at the module interface is exactly the isolation
  Principle III promises ("backend testable against a mocked LLM interface").
- **Alternatives considered**: Jest/Vitest (extra dependency, no need);
  hitting the real Gemini API in tests (rejected: cost, flakiness,
  key-handling in CI).
