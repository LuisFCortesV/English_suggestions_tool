---
description: "Task list for English Register Suggestions implementation"
---

# Tasks: English Register Suggestions

**Input**: Design documents from `/specs/001-english-register-suggestions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Test tasks ARE included — the project constitution (Principle II +
Development Workflow & Quality Gates) requires error-path tests wherever those
paths exist, and the plan defines a testing strategy.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each description

## Path Conventions

Web app layout per plan.md: backend at `backend/`, frontend at `frontend/`
(repository root).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create the repository structure per plan.md: `backend/src/routes/`, `backend/src/llm/`, `backend/tests/`, and `frontend/`
- [X] T002 Initialize the backend Node.js project in `backend/package.json` (ES modules: `"type": "module"`; scripts: `start` → `node src/server.js`, `test` → `node --test`); add dependencies `express`, `@google/genai`, `dotenv`
- [X] T003 [P] Create `backend/.env.example` with `GEMINI_API_KEY=`, `PORT=3000`, `GEMINI_MODEL=gemini-2.5-flash`, and add `backend/.gitignore` ignoring `node_modules/` and `.env`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement environment config loading in `backend/src/server.js`: load `dotenv`, read `GEMINI_API_KEY`/`PORT`/`GEMINI_MODEL`, fail fast with a clear log message if `GEMINI_API_KEY` is missing, then start the Express app
- [X] T005 Create the Express app in `backend/src/app.js`: JSON body parsing middleware, static serving of `frontend/` at `/`, mount the suggestions router (placeholder import), and a centralized error handler that emits the `{ error: { code, message } }` shape (per contracts/api.md) and logs cause with context server-side
- [X] T006 [P] Define typed error classes in `backend/src/llm/errors.js`: `GenerationTimeoutError` and `GenerationFailedError` (used by the LLM module and mapped by the route to 504/502)

**Checkpoint**: App boots, serves static files, and has a working error shape — user stories can now begin

---

## Phase 3: User Story 1 - Get register suggestions for a phrase (Priority: P1) 🎯 MVP

**Goal**: User enters an English (or Spanish) phrase, clicks the button, and
sees a labeled formal suggestion (always) plus neutral/informal when distinct,
each with a Spanish explanation. Spanish input is accepted with a gentle note.

**Independent Test**: Enter "I want to know if you can come to the meeting",
submit, and confirm a labeled formal suggestion with a Spanish explanation
appears; neutral/informal appear only when distinct (quickstart scenario 1).
Entering a Spanish phrase still returns English suggestions plus the
encouragement note (scenario 6).

### Implementation for User Story 1

- [X] T007 [P] [US1] Define the suggestion prompts as named constants in `backend/src/llm/prompts.js`: a system/instruction prompt enforcing register rules (formal always; neutral/informal only if distinct — FR-004–007), Spanish explanations (FR-008), Spanish/mixed-input detection driving `wasSpanishInput` (FR-015), and a builder that injects the phrase and optional context
- [X] T008 [P] [US1] Implement the Gemini client in `backend/src/llm/geminiClient.js`: call `@google/genai` `generateContent` with `responseMimeType: application/json` + `responseSchema` (suggestions[] of {register, text, explanation} + wasSpanishInput), enforce a 15s `AbortController` timeout, parse and validate the response (formal present, valid register enum, non-empty fields), throwing `GenerationTimeoutError`/`GenerationFailedError` from errors.js on failure
- [X] T009 [US1] Implement the LLM module interface in `backend/src/llm/index.js`: export `generateSuggestions(phrase, context)` that builds the prompt (T007), calls the client (T008), and returns the validated `SuggestionSet` (depends on T007, T008)
- [X] T010 [US1] Implement the route in `backend/src/routes/suggestions.js`: `POST /api/suggestions` — define/import the `MAX_PHRASE_LENGTH` constant (value per contracts/api.md Constants) as the single backend authority, trim/validate `phrase` (empty → 400 `EMPTY_PHRASE`, length > `MAX_PHRASE_LENGTH` → 400 `PHRASE_TOO_LONG`), call `generateSuggestions`, map `GenerationTimeoutError` → 504 and `GenerationFailedError` → 502 via the error handler, return 200 with the SuggestionSet (depends on T009; wire into app.js T005)
- [X] T011 [P] [US1] Build the frontend page in `frontend/index.html` and `frontend/styles.css`: Spanish UI with phrase field, optional context field, submit button, and a results area (FR-001–003, FR-014)
- [X] T012 [US1] Implement frontend logic in `frontend/app.js`: read `MAX_PHRASE_LENGTH` (the value documented in contracts/api.md Constants, referenced as a single named constant rather than a bare literal) for the pre-submit length-validation message; `fetch` POST to `/api/suggestions`, render register-labeled suggestions with explanations using `textContent`/`createElement` (no innerHTML on response data), show loading state, and render the documented error messages on non-200 responses (depends on T011; consumes contract from T010)
- [X] T013 [US1] Implement Spanish-input handling end-to-end (FR-015): ensure the prompt/schema set `wasSpanishInput` (T007/T008) and `frontend/app.js` renders the gentle Spanish encouragement note only when `wasSpanishInput` is true, suppressing it for English input (depends on T012, T008)

### Tests for User Story 1

- [X] T014 [P] [US1] LLM module tests in `backend/tests/llm.test.js` (`node:test`, Gemini SDK mocked): prompt assembly includes phrase/context; valid response parses; malformed responses (missing formal, bad register, empty text) throw `GenerationFailedError`; timeout throws `GenerationTimeoutError`
- [X] T015 [P] [US1] Route tests in `backend/tests/suggestions.test.js` (`supertest`, `llm/index.js` mocked): success returns 200 with formal always present; empty → 400 `EMPTY_PHRASE`; length > `MAX_PHRASE_LENGTH` → 400 `PHRASE_TOO_LONG`; `GenerationTimeoutError` → 504; `GenerationFailedError` → 502; error responses never leak provider detail
- [X] T016 [P] [US1] Add a test in `backend/tests/suggestions.test.js` covering the `wasSpanishInput: true` response path (route returns the flag intact; frontend note behavior validated manually via quickstart scenario 6)
- [X] T024 [US1] Implement the `isAlreadyOptimal` flag end-to-end (FR-016): add the optional `isAlreadyOptimal` boolean to the suggestion item in `RESPONSE_SCHEMA` and instruct the model in `backend/src/llm/prompts.js` to set it true on the formal suggestion when it is identical/effectively identical to the original; carry it through validation in `backend/src/llm/geminiClient.js` (coerce to boolean, meaningful only on formal); in `frontend/app.js` render a distinctive green indicator on the first line of the formal suggestion's card when `isAlreadyOptimal` is true, and add the `.already-optimal` style in `frontend/styles.css`; add a passthrough assertion in `backend/tests/llm.test.js`

**Checkpoint**: User Story 1 is fully functional — the MVP is testable end-to-end, including Spanish input

---

## Phase 4: User Story 2 - Tailor suggestions with optional context (Priority: P2)

**Goal**: The optional context (audience/situation) influences suggestions and
explanations.

**Independent Test**: Submit the same phrase with and without context "correo
formal a mi jefe" and confirm the contextualized output reflects the audience
(quickstart scenario 2).

### Implementation for User Story 2

- [X] T017 [US2] Extend the prompt builder in `backend/src/llm/prompts.js` so the optional context is incorporated into the instruction (audience/situation shapes register choice and explanations) and is gracefully omitted when absent (FR-002)
- [X] T018 [US2] Verify the route in `backend/src/routes/suggestions.js` passes `context` through to `generateSuggestions` and treats empty/whitespace context as absent (depends on T017)

### Tests for User Story 2

- [X] T019 [P] [US2] Add a test in `backend/tests/llm.test.js` asserting the assembled prompt includes the provided context and omits the context section when none is given

**Checkpoint**: User Stories 1 and 2 both work; context meaningfully changes output

---

## Phase 5: User Story 3 - Copy a suggestion (Priority: P3)

**Goal**: The user copies any single suggestion's text with one action and
sees a confirmation.

**Independent Test**: Request suggestions, click copy on one, confirm only the
English text is on the clipboard and a "Copiado" confirmation shows
(quickstart scenario 3).

### Implementation for User Story 3

- [X] T020 [US3] Add a copy control per suggestion in `frontend/app.js` (and any needed markup/styles in `frontend/index.html`/`frontend/styles.css`): on activation, copy only the suggestion `text` via `navigator.clipboard.writeText` and show a brief Spanish "Copiado" confirmation (FR-009; depends on T012)

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Spec requirements that span stories and final validation

- [X] T021 Implement duplicate-submission prevention in `frontend/app.js` (FR-013): disable the submit button and show a working indicator while a request is in flight, re-enabling on resolution
- [X] T022 [P] Write `backend/README.md` with setup/run/test instructions mirroring quickstart.md (env vars, `npm start`, `npm test`)
- [X] T023 Run the full `quickstart.md` validation (scenarios 1–9) against the running app and the automated test suite; additionally, measure and record the response time of `/api/suggestions` across several requests to confirm SC-003 (≤10s for ≥95% of attempts) and the 15s hard timeout (FR-012)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational completion
- **Polish (Phase 6)**: Depends on the relevant user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — the MVP (now includes Spanish-input handling, FR-015), no dependency on other stories
- **US2 (P2)**: Depends on Foundational; builds on US1's prompt/route but is independently testable
- **US3 (P3)**: Depends on Foundational; builds on US1's frontend rendering (T012) but is independently testable

### Within Each User Story

- LLM prompts/client → LLM interface → route → frontend
- Tests can be written alongside; they mock the layer below per Principle III

### Parallel Opportunities

- T003 runs parallel within Setup; T006 parallel within Foundational
- US1: T007 and T008 (different files) in parallel; T011 parallel to backend tasks; T014, T015, T016 in parallel
- After Foundational, US1/US2/US3 can be staffed in parallel (mind the noted frontend touchpoints in app.js)

---

## Parallel Example: User Story 1

```bash
# LLM building blocks (different files) together:
Task: "Define prompts in backend/src/llm/prompts.js"
Task: "Implement Gemini client in backend/src/llm/geminiClient.js"

# Frontend shell in parallel with backend wiring:
Task: "Build frontend page in frontend/index.html + frontend/styles.css"

# All three test tasks together (mocked layers):
Task: "LLM module tests in backend/tests/llm.test.js"
Task: "Route tests in backend/tests/suggestions.test.js"
Task: "wasSpanishInput response-path test in backend/tests/suggestions.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1 (T007–T016, including tests and Spanish-input handling)
4. **STOP and VALIDATE**: quickstart scenarios 1, 4, 5, 6, 7, 8, 9
5. Deploy/demo — this is a usable product

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate → demo (MVP: core suggestions + Spanish-input handling + error handling)
3. US2 → validate → demo (context tailoring)
4. US3 → validate → demo (copy)
5. Polish (FR-013 duplicate prevention, README, full quickstart + SC-003 timing)

---

## Notes

- [P] = different files, no dependencies
- [Story] label maps each task to its user story for traceability
- Error-path tests are mandatory per the constitution — do not skip T014/T015
- `MAX_PHRASE_LENGTH` is defined once (contracts/api.md Constants), enforced by the backend (T010) and referenced by the frontend (T012) — never hardcode 300 separately per layer
- The LLM stays behind `backend/src/llm/index.js`; routes/frontend never import provider types (Principle III)
- No database, no auth, no rate limiting in v1 (per spec/clarifications)
- Commit after each task or logical group
