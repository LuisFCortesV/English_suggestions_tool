# Quickstart: English Register Suggestions

**Date**: 2026-06-12 | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/api.md](./contracts/api.md)

Validation guide proving the feature works end-to-end. Run after
implementation (`/speckit-implement`).

## Prerequisites

- Node.js 20+ and npm
- A Gemini API key (https://aistudio.google.com/apikey)

## Setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env and set GEMINI_API_KEY=<your key>
```

## Run

```powershell
npm start          # from backend/ — starts Express (default http://localhost:3000)
```

Open http://localhost:3000 — the page (in Spanish) shows the phrase field,
optional context field, and the suggestions button.

## Automated tests

```powershell
cd backend
npm test           # node:test — LLM module + route suites, all provider calls mocked
```

Expected: all tests pass, including the mandatory error-path tests (empty
input 400, too-long 400, timeout 504, generation failure 502, formal-always-
present invariant).

## Validation scenarios (manual, against the running app)

| # | Scenario | Steps | Expected outcome |
|---|----------|-------|------------------|
| 1 | Core suggestions (US1) | Enter "I want to know if you can come to the meeting", click the button | Within ~10s: a formal suggestion (labeled, with Spanish explanation) always appears; neutral/informal appear only if distinct; no placeholders for missing registers |
| 2 | Context tailoring (US2) | Same phrase + context "correo formal a mi jefe" | Suggestions/explanations reflect the formal-email audience |
| 3 | Copy (US3) | Click copy on any suggestion | Suggestion text (only the English text) lands on the clipboard; brief "Copiado" confirmation appears |
| 4 | Empty input | Click the button with an empty phrase field | Spanish message asking for a phrase; no network call to `/api/suggestions` (check DevTools) |
| 5 | Too-long input | Paste >300 characters and submit | Spanish message indicating the 300-char limit |
| 6 | Spanish input (FR-015) | Enter "quería saber si puedes venir a la reunión" | English suggestions for the intended meaning + gentle Spanish note encouraging trying English next time; note absent in scenario 1 |
| 7 | Generation failure | Stop network/use an invalid `GEMINI_API_KEY`, submit a phrase | Clear Spanish error message (per contract `GENERATION_FAILED`); no technical details, no frozen spinner |
| 8 | Duplicate submission (FR-013) | Submit and immediately click the button again | Button disabled / no second request while the first is in flight |
| 9 | No-login check (SC-001) | Fresh incognito window → suggestions | Full flow works with no account, cookie, or sign-up |

API-level spot check (optional):

```powershell
curl -X POST http://localhost:3000/api/suggestions -H "Content-Type: application/json" -d '{"phrase":"I want to know if you can come"}'
```

Expected: 200 with the [contract](./contracts/api.md) success shape; exactly
one `formal` suggestion present.
