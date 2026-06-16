// MAX_PHRASE_LENGTH mirrors the value documented in
// specs/001-english-register-suggestions/contracts/api.md (Constants).
// The backend is the authority; this constant exists only for the pre-submit
// UX message so we never send input we know will be rejected.
const MAX_PHRASE_LENGTH = 300;

const REGISTER_LABELS = {
  formal: "Formal (Oxford)",
  neutral: "Neutral",
  informal: "Informal",
};

const GENERIC_ERROR =
  "No pudimos generar sugerencias en este momento. Por favor intenta de nuevo.";

const form = document.getElementById("suggest-form");
const phraseEl = document.getElementById("phrase");
const contextEl = document.getElementById("context");
const submitBtn = document.getElementById("submit-btn");
const messageEl = document.getElementById("form-message");
const loadingEl = document.getElementById("loading");
const noteEl = document.getElementById("spanish-note");
const resultsEl = document.getElementById("results");

let inFlight = false;

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.hidden = false;
}

function clearTransient() {
  messageEl.hidden = true;
  messageEl.textContent = "";
  noteEl.hidden = true;
  noteEl.textContent = "";
  resultsEl.replaceChildren();
}

function setBusy(busy) {
  inFlight = busy;
  submitBtn.disabled = busy;
  loadingEl.hidden = !busy;
}

function renderSuggestions(set) {
  const fragment = document.createDocumentFragment();

  for (const s of set.suggestions) {
    const card = document.createElement("article");
    card.className = "card";

    if (s.register === "formal" && s.isAlreadyOptimal) {
      const optimal = document.createElement("p");
      optimal.className = "already-optimal";
      optimal.textContent =
        "✓ Esta ya es la forma más formal de escribirlo: no hay una versión más formal que esta.";
      card.append(optimal);
    }

    const head = document.createElement("div");
    head.className = "card-head";

    const register = document.createElement("span");
    register.className = "register";
    register.textContent = REGISTER_LABELS[s.register] || s.register;

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copiar";
    copyBtn.addEventListener("click", () => copySuggestion(s.text, copyBtn));

    head.append(register, copyBtn);

    const text = document.createElement("p");
    text.className = "suggestion-text";
    text.textContent = s.text;

    const explanation = document.createElement("p");
    explanation.className = "explanation";
    explanation.textContent = s.explanation;

    card.append(head, text, explanation);
    fragment.append(card);
  }

  resultsEl.replaceChildren(fragment);

  if (set.wasSpanishInput) {
    noteEl.textContent =
      "Generamos las sugerencias a partir de tu frase en español. " +
      "Intenta escribirla en inglés la próxima vez para practicar.";
    noteEl.hidden = false;
  }
}

async function copySuggestion(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = "Copiado";
    setTimeout(() => {
      btn.textContent = original;
    }, 1500);
  } catch {
    showMessage("No se pudo copiar al portapapeles.");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (inFlight) return;

  clearTransient();

  const phrase = phraseEl.value.trim();
  const context = contextEl.value.trim();

  if (phrase.length === 0) {
    showMessage("Por favor escribe una palabra o frase para recibir sugerencias.");
    return;
  }
  if (phrase.length > MAX_PHRASE_LENGTH) {
    showMessage(`La frase es demasiado larga (máximo ${MAX_PHRASE_LENGTH} caracteres).`);
    return;
  }

  setBusy(true);
  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phrase, context }),
    });

    if (!response.ok) {
      let msg = GENERIC_ERROR;
      try {
        const body = await response.json();
        if (body?.error?.message) msg = body.error.message;
      } catch {
        /* keep generic message */
      }
      showMessage(msg);
      return;
    }

    const set = await response.json();
    renderSuggestions(set);
  } catch {
    showMessage(GENERIC_ERROR);
  } finally {
    setBusy(false);
  }
});
