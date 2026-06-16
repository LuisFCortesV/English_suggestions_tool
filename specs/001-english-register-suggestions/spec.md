# Feature Specification: English Register Suggestions

**Feature Branch**: `001-english-register-suggestions`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "Construye una herramienta web que ayude a mejorar la forma de escribir en inglés. El usuario escribe una palabra o frase en inglés que quiere expresar. Opcionalmente, puede agregar contexto adicional: a quién va dirigido o qué situación está describiendo. A partir de eso, el sistema genera sugerencias de cómo expresar lo mismo en distintos registros o niveles de formalidad (formal/estándar siempre; neutral e informal solo si aportan algo distinto), cada una con una breve explicación. El usuario puede copiar cualquier sugerencia. Sin login. Interfaz simple con validación de campo vacío y mensaje de error claro si el servicio falla."

## Clarifications

### Session 2026-06-12

- Q: What language are the interface and suggestion explanations presented in? → A: Spanish UI and Spanish explanations; the suggestions themselves are in English.
- Q: What is the timeout before suggestion generation is declared failed? → A: 15 seconds (success target remains 10 seconds per SC-003).
- Q: Should the public, no-login tool have per-visitor rate limiting to protect generation costs? → A: No limits in v1 — accept the cost risk; only duplicate in-flight submissions are prevented.
- Q: What happens when the user enters the phrase in Spanish instead of English? → A: Hybrid — accept Spanish or mixed Spanish/English input and generate the English suggestions normally, but show a gentle note encouraging the user to attempt English first next time.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get register suggestions for a phrase (Priority: P1)

A user who is unsure how to express something naturally in English types an
English word or phrase into the tool and requests suggestions. The system
returns a formal/standard (Oxford/Cambridge-style) version of the phrase —
always, whenever a more correct, natural, or standard form than the original
exists — and, when they add distinct value, a neutral/everyday version and an
informal/casual version. Each suggestion is labeled with its register and
includes a brief explanation of what makes it natural in that register and
how it differs from the original.

**Why this priority**: This is the core value of the product. Without it,
nothing else matters. A user who only ever uses this flow still gets the full
benefit of the tool.

**Independent Test**: Can be fully tested by entering a phrase such as
"I want to know if you can come to the meeting" and verifying that a labeled
formal suggestion with an explanation is returned, with neutral/informal
variants appearing only when they differ meaningfully.

**Acceptance Scenarios**:

1. **Given** the input field contains an English phrase, **When** the user
   requests suggestions, **Then** the system displays a formal/standard
   suggestion labeled as such, with a brief explanation of why it is the
   standard or preferred form.
2. **Given** a phrase for which natural neutral and informal variants exist
   that differ from the formal version, **When** the user requests
   suggestions, **Then** the neutral and informal suggestions are displayed,
   each labeled by register and each with its own explanation.
3. **Given** a phrase whose neutral or informal variant would be identical to
   the formal version (or no natural variant exists in that register),
   **When** the user requests suggestions, **Then** that variant is simply
   omitted from the results, with no message announcing its absence — and the
   formal suggestion is still present.
4. **Given** a phrase that is a literal translation from Spanish, **When**
   the user requests suggestions, **Then** at least one explanation points
   out that the suggestion avoids the literal translation.

---

### User Story 2 - Tailor suggestions with optional context (Priority: P2)

Before requesting suggestions, the user optionally describes who the message
is for (e.g., a friend, a colleague, a formal email) or what situation they
are describing. The suggestions and explanations take this context into
account so the phrasing fits the audience and situation.

**Why this priority**: Context materially improves suggestion quality and
relevance, but the tool is already useful without it (P1 works standalone).

**Independent Test**: Can be tested by submitting the same phrase twice —
once without context and once with context such as "formal email to my boss"
— and verifying that the contextualized suggestions reflect the stated
audience/situation.

**Acceptance Scenarios**:

1. **Given** the user has entered a phrase and added context describing the
   audience or situation, **When** they request suggestions, **Then** the
   returned suggestions and explanations reflect that context.
2. **Given** the user leaves the context field empty, **When** they request
   suggestions, **Then** the system returns suggestions normally without
   requiring context.

---

### User Story 3 - Copy a suggestion (Priority: P3)

After receiving suggestions, the user copies the one they want with a single
action so they can paste it into their email, chat, or document.

**Why this priority**: Copying is a convenience that completes the workflow,
but the user could still read and retype a suggestion manually.

**Independent Test**: Can be tested by requesting suggestions for any phrase,
activating the copy action on one suggestion, and verifying the suggestion
text is on the clipboard and a confirmation is shown.

**Acceptance Scenarios**:

1. **Given** suggestions are displayed, **When** the user activates the copy
   action on a suggestion, **Then** that suggestion's text (without its label
   or explanation) is copied to the clipboard.
2. **Given** the user has copied a suggestion, **When** the copy completes,
   **Then** the interface briefly confirms the copy succeeded.

---

### Edge Cases

- Empty input: the user presses the suggestions button with an empty (or
  whitespace-only) phrase field — the system shows a message asking them to
  enter a phrase and does not attempt generation.
- Generation service failure or timeout (15 seconds): the system shows a
  clear, human-readable error message inviting the user to try again; no
  technical details are exposed.
- Input already in ideal standard English: the system returns the formal
  suggestion confirming/presenting the standard form (which may match the
  original) with an explanation noting it is already the standard phrasing.
- Input in Spanish or mixed Spanish/English: the system accepts the input
  and generates the English suggestions expressing the intended meaning
  (formal always; neutral/informal if distinct), and additionally shows a
  gentle note in Spanish encouraging the user to attempt the phrase in
  English first next time; it never rejects or fails silently.
- Very long input: input beyond the maximum length (see FR-011) is rejected
  with a clear message before generation is attempted.
- Repeated rapid submissions: a new request while one is in progress is
  prevented (the action is disabled until the current request resolves).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let the user enter an English word or phrase in a
  free-text input field.
- **FR-002**: System MUST provide an optional free-text context field where
  the user can describe the audience (e.g., friend, colleague, formal email)
  and/or the situation.
- **FR-003**: System MUST generate suggestions on explicit user action (a
  button), not automatically while typing.
- **FR-004**: Every successful response MUST include a formal/standard
  (Oxford/Cambridge-style) suggestion whenever a more correct, natural, or
  standard form than the original exists; if the original is already the
  standard form, the formal suggestion presents that standard form with an
  explanation saying so. The formal suggestion is the primary, mandatory
  output of the system.
- **FR-005**: System MUST include a neutral/everyday suggestion only when a
  natural neutral variant exists that differs meaningfully from the formal
  suggestion.
- **FR-006**: System MUST include an informal/casual suggestion (including
  colloquial expressions where applicable) only when a natural informal
  variant exists that differs meaningfully from the formal and neutral
  suggestions.
- **FR-007**: When a neutral or informal variant does not apply, the system
  MUST simply omit it — no placeholder, apology, or notice of absence is
  shown.
- **FR-008**: Each displayed suggestion MUST be labeled with its register
  (formal, neutral, or informal) and accompanied by a brief explanation,
  written in Spanish, of what makes it natural in that register and why it
  differs from the original (e.g., avoids a literal Spanish translation,
  preferred standard form in British English, more natural between friends).
- **FR-014**: The interface (labels, buttons, validation and error messages)
  MUST be presented in Spanish; suggestion texts are in English.
- **FR-009**: Users MUST be able to copy any individual suggestion's text to
  the clipboard with a single action, with visible confirmation of success.
- **FR-010**: System MUST be usable without any account, registration, or
  login.
- **FR-011**: System MUST validate input before generation: an empty or
  whitespace-only phrase shows a message asking the user to enter a phrase;
  input longer than 300 characters is rejected with a message indicating the
  limit.
- **FR-012**: If suggestion generation fails or does not respond within 15
  seconds, the system MUST show a clear, user-friendly error message (e.g.,
  inviting the user to try again) and MUST NOT expose technical details.
- **FR-013**: While a request is in progress, the system MUST indicate that
  it is working and prevent duplicate submissions until the request
  resolves.
- **FR-015**: When the input phrase is in Spanish or mixed Spanish/English,
  the system MUST still generate the English suggestions expressing the
  intended meaning (per FR-004 through FR-008) and MUST additionally display
  a gentle, non-blocking note in Spanish encouraging the user to attempt the
  phrase in English first next time. The note MUST NOT appear for input that
  is already in English.
- **FR-016**: When the formal suggestion is identical (or effectively
  identical) to the user's original phrase — i.e., the original is already the
  most formal/standard form possible — the system MUST signal this explicitly
  via a structured flag (`isAlreadyOptimal`) returned alongside that
  suggestion. When the flag is true, the frontend MUST show a distinctive
  visual indicator (a green-colored message on the first line of that
  suggestion's card) announcing that this is already the most formal way to
  write it. The flag MUST be false (and no indicator shown) when the formal
  suggestion differs meaningfully from the original.

### Key Entities

- **Suggestion Request**: The user's submission — the English word or phrase
  (required) and the optional audience/situation context. Not persisted
  beyond serving the response.
- **Suggestion**: A single generated alternative — its register label
  (formal, neutral, or informal), the suggested English text, and its
  explanation.
- **Suggestion Set**: The response to one request — always contains the
  formal suggestion; may contain the neutral and/or informal suggestions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can go from landing on the page to seeing
  suggestions for their phrase in under 1 minute, with no sign-up steps.
- **SC-002**: 100% of successful responses contain a labeled formal/standard
  suggestion with an explanation.
- **SC-003**: Suggestions are displayed within 10 seconds of the user's
  request in at least 95% of attempts under normal conditions.
- **SC-004**: For empty submissions and for generation failures, 100% of
  cases show the corresponding user-facing message (never a blank screen,
  frozen state, or raw technical error).
- **SC-005**: 90% of users can copy a suggestion successfully on their first
  attempt without instructions.

## Assumptions

- The tool targets Spanish speakers writing in English (explanations may
  reference Spanish-influenced phrasing), but any user may use it. English
  input is the primary expected case; Spanish or mixed input is accepted
  with an encouragement note (per clarification, FR-015). UI and
  explanations are in Spanish (per clarification); no language toggle in v1.
- "Formal/standard (Oxford/Cambridge)" is interpreted as standard British
  English as codified by major dictionaries and style references; it does
  not require integration with any specific dictionary product.
- When the original phrase is already ideal standard English, the formal
  suggestion is still shown (presenting/confirming the standard form) so the
  response always contains the mandatory formal suggestion.
- A maximum input length of 300 characters is a reasonable default for words
  and short phrases; longer texts (paragraphs, full emails) are out of scope
  for v1.
- Requests and suggestions are not stored; there is no history or favorites
  in v1.
- Per clarification, v1 has no per-visitor rate limiting (cost risk
  explicitly accepted); the only safeguard is preventing duplicate in-flight
  submissions (FR-013). Rate limiting may be revisited post-v1.
- The tool is a public web page usable on modern desktop and mobile
  browsers; offline use is out of scope.
- Suggestion generation depends on an external language-generation service;
  its availability is outside the system's control, which is why explicit
  failure messaging is required (FR-012).
