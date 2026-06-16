# English Register Suggestions — Backend

Node.js + Express backend that generates English phrasing suggestions in
different registers (formal / neutral / informal) via the Gemini API, and
serves the static frontend.

## Prerequisites

- Node.js 20+ and npm
- A Gemini API key: https://aistudio.google.com/apikey

## Setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env and set GEMINI_API_KEY=<your key>
```

Environment variables (`.env`):

| Variable | Required | Default | Meaning |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | yes | — | Gemini API key; the server refuses to start without it |
| `PORT` | no | 3000 | HTTP port |
| `GEMINI_MODEL` | no | gemini-2.5-flash | Model used for generation |

## Run

```powershell
npm start
```

Then open http://localhost:3000 — the Spanish UI is served from `../frontend`.

## Test

```powershell
npm test
```

Runs the Node.js built-in test runner (`node --test`). The Gemini SDK and the
LLM module are mocked, so no API key or network access is needed for tests.
Suites:

- `tests/llm.test.js` — prompt assembly and response validation
- `tests/suggestions.test.js` — route validation, error mapping, and success shape

## Architecture

The LLM integration is isolated in `src/llm/` behind a single interface,
`generateSuggestions(phrase, context)` (`src/llm/index.js`). Routes and the
frontend never touch provider types or prompts. Prompts live as named
constants in `src/llm/prompts.js`. The API key is read from the environment
and never exposed to the frontend.

See `../specs/001-english-register-suggestions/` for the spec, plan, contract,
and quickstart validation guide.
