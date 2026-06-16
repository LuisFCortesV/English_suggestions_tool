import { getConfig, GENERATION_TIMEOUT_MS } from "../config.js";
import { GenerationTimeoutError, GenerationFailedError } from "./errors.js";
import {
  SYSTEM_INSTRUCTION,
  RESPONSE_SCHEMA,
  VALID_REGISTERS,
  buildUserContent,
} from "./prompts.js";

// Default model caller: performs the real Gemini SDK call. Returns an object
// shaped like the SDK response ({ text }). Injectable via requestSuggestions
// options so tests never touch the network.
async function defaultCallModel({ signal, userContent }) {
  const { model, apiKey } = getConfig();
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: userContent,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      abortSignal: signal,
    },
  });
  return { text: response.text };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Validates and normalizes the parsed model output into a SuggestionSet.
// Enforces the spec invariants at the LLM boundary (Constitution Principle II):
// formal always present, valid + unique registers, non-empty fields.
// Throws GenerationFailedError on any violation.
export function validateSuggestionSet(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.suggestions)) {
    throw new GenerationFailedError("Respuesta sin arreglo de sugerencias");
  }

  const { suggestions } = raw;
  if (suggestions.length < 1 || suggestions.length > 3) {
    throw new GenerationFailedError(
      `Número de sugerencias inválido: ${suggestions.length}`,
    );
  }

  const seen = new Set();
  for (const s of suggestions) {
    if (!s || typeof s !== "object") {
      throw new GenerationFailedError("Sugerencia no es un objeto");
    }
    if (!VALID_REGISTERS.includes(s.register)) {
      throw new GenerationFailedError(`Registro inválido: ${s.register}`);
    }
    if (seen.has(s.register)) {
      throw new GenerationFailedError(`Registro duplicado: ${s.register}`);
    }
    seen.add(s.register);
    if (!isNonEmptyString(s.text) || !isNonEmptyString(s.explanation)) {
      throw new GenerationFailedError("Texto o explicación vacíos");
    }
  }

  if (!seen.has("formal")) {
    throw new GenerationFailedError("Falta la sugerencia formal");
  }

  // Normalize ordering: formal, neutral, informal.
  const ordered = VALID_REGISTERS.map((register) =>
    suggestions.find((s) => s.register === register),
  )
    .filter(Boolean)
    .map((s) => ({
      register: s.register,
      text: s.text.trim(),
      explanation: s.explanation.trim(),
      // Only meaningful on the formal suggestion (FR-016); coerced to boolean.
      isAlreadyOptimal: s.register === "formal" && s.isAlreadyOptimal === true,
    }));

  return {
    suggestions: ordered,
    wasSpanishInput: raw.wasSpanishInput === true,
  };
}

// Builds the prompt, calls the model with a hard timeout, parses and validates
// the response. Throws GenerationTimeoutError / GenerationFailedError.
export async function requestSuggestions(
  phrase,
  context,
  { callModel = defaultCallModel, timeoutMs = GENERATION_TIMEOUT_MS } = {},
) {
  const userContent = buildUserContent(phrase, context);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await callModel({ signal: controller.signal, userContent });
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new GenerationTimeoutError(cause);
    }
    throw new GenerationFailedError(cause);
  } finally {
    clearTimeout(timer);
  }

  let parsed;
  try {
    parsed = typeof response?.text === "string"
      ? JSON.parse(response.text)
      : response;
  } catch (cause) {
    throw new GenerationFailedError(cause);
  }

  return validateSuggestionSet(parsed);
}
