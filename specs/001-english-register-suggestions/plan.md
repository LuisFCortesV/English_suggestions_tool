# Implementation Plan: English Register Suggestions

**Branch**: `001-english-register-suggestions` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-english-register-suggestions/spec.md`

## Summary

A public, no-login web tool where a user types an English (or Spanish) word or
phrase plus optional audience/situation context, and receives register-labeled
English suggestions (formal — always; neutral/informal — only when distinct),
each with a Spanish explanation. Technical approach: a vanilla HTML/CSS/JS
frontend talking to a Node.js + Express backend over one JSON endpoint; the
backend delegates generation to an isolated Gemini integration module that
returns structured suggestions. No database, no persistence.

## Technical Context

**Language/Version**: JavaScript (Node.js 20+ LTS, ES modules); browser-side
vanilla ES2020+ JavaScript

**Primary Dependencies**: Express (HTTP server + static file serving),
`@google/genai` (official Gemini API SDK), `dotenv` (env config in dev)

**Storage**: N/A — no persistence of requests or suggestions (per spec)

**Testing**: Node.js built-in test runner (`node:test`) with the LLM module
mocked behind its interface; `supertest` for HTTP-level route tests

**Target Platform**: Backend on any Node.js 20+ host; frontend in modern
desktop and mobile browsers (clipboard API + fetch required)

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Suggestions displayed ≤10s for ≥95% of requests
(SC-003); hard generation timeout at 15s (FR-012)

**Constraints**: No login/accounts; no rate limiting in v1 (cost risk
accepted); 300-char input limit; Spanish UI/explanations, English suggestions;
Gemini API key only in backend env, never in frontend

**Scale/Scope**: Small public tool; single endpoint; frontend view states
(idle, loading, results, error); no concurrency concerns beyond stateless
request handling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Principle | Status | Evidence |
|------|-----------|--------|----------|
| G1 | I. Code Simplicity | PASS | Vanilla JS frontend (no UI framework), no DB, 3 runtime deps (express, @google/genai, dotenv), plain functions; no speculative abstractions planned |
| G2 | II. Clear Error Handling | PASS | Single documented error shape (`{ error: { code, message } }`) for all API errors; 15s timeout; Gemini failure modes (timeout, rate limit, malformed response, outage) each mapped to a Spanish user message; backend logs cause with context; no provider payloads reach the frontend |
| G3 | III. Frontend/Backend/LLM Separation | PASS | `frontend/` calls only `POST /api/suggestions`; all Gemini concerns (client, key, prompts, model, response parsing) live in `backend/src/llm/` behind one function `generateSuggestions(phrase, context)`; routes never import provider types; prompts are a dedicated artifact (`backend/src/llm/prompts.js`) |
| G4 | Architecture Constraints | PASS | `GEMINI_API_KEY` via env only; repo layout mirrors layers; prompts centralized |

**Post-Phase 1 re-check**: PASS — the API contract ([contracts/api.md](./contracts/api.md))
keeps the frontend provider-agnostic; the data model adds no entities beyond
the spec's three; no Complexity Tracking entries needed.

**Amendment (FR-016)**: FR-016 extended the existing Suggestion entity with an
optional `isAlreadyOptimal` boolean (no new entity) — produced and validated
inside `backend/src/llm/` and surfaced through the documented contract field.
Gates remain PASS; no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-english-register-suggestions/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── server.js            # Entry point: loads env, starts Express
│   ├── app.js               # Express app: JSON middleware, static serving, routes, error handler
│   ├── routes/
│   │   └── suggestions.js   # POST /api/suggestions — validation + orchestration
│   └── llm/                 # LLM integration module (isolated; only export is its interface)
│       ├── index.js         # generateSuggestions(phrase, context) → SuggestionSet
│       ├── geminiClient.js  # Gemini SDK call, 15s timeout, response validation
│       └── prompts.js       # Prompt templates as named, reviewable constants
├── tests/
│   ├── llm.test.js          # LLM module: prompt assembly, response parsing/validation (SDK mocked)
│   └── suggestions.test.js  # Route tests with llm/index.js mocked (validation, error shapes)
├── package.json
└── .env.example             # GEMINI_API_KEY=, PORT=, GEMINI_MODEL=

frontend/
├── index.html               # Phrase field, context field, button, results area (Spanish UI)
├── styles.css
└── app.js                   # fetch → /api/suggestions; render states: loading, results, errors, copy
```

**Structure Decision**: Web application layout per Constitution Principle III —
`frontend/` (static files, served by Express but with zero knowledge of the
LLM) and `backend/` with the Gemini integration confined to
`backend/src/llm/`. The frontend's only contract is `POST /api/suggestions`
(see [contracts/api.md](./contracts/api.md)). No `frontend/tests/` in v1: the
frontend is a thin render layer over the API contract and is validated via the
quickstart scenarios, in keeping with Principle I.

## Complexity Tracking

No constitution violations — no entries required.
