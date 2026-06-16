import { test } from "node:test";
import assert from "node:assert/strict";

import { buildUserContent } from "../src/llm/prompts.js";
import {
  requestSuggestions,
  validateSuggestionSet,
} from "../src/llm/geminiClient.js";
import {
  GenerationTimeoutError,
  GenerationFailedError,
} from "../src/llm/errors.js";

function jsonResponse(obj) {
  return { text: JSON.stringify(obj) };
}

const validSet = {
  suggestions: [
    { register: "formal", text: "Formal text", explanation: "Explicación formal" },
    { register: "informal", text: "Informal text", explanation: "Explicación informal" },
  ],
  wasSpanishInput: false,
};

test("buildUserContent includes the phrase", () => {
  const content = buildUserContent("hello there", undefined);
  assert.match(content, /hello there/);
});

test("buildUserContent includes context when provided", () => {
  const content = buildUserContent("hello", "correo formal a mi jefe");
  assert.match(content, /correo formal a mi jefe/);
});

test("buildUserContent omits the context section when none is given", () => {
  const content = buildUserContent("hello", "   ");
  assert.doesNotMatch(content, /Contexto/);
});

test("validateSuggestionSet orders registers formal, neutral, informal", () => {
  const set = validateSuggestionSet({
    suggestions: [
      { register: "informal", text: "c", explanation: "x" },
      { register: "formal", text: "a", explanation: "y" },
      { register: "neutral", text: "b", explanation: "z" },
    ],
    wasSpanishInput: true,
  });
  assert.deepEqual(
    set.suggestions.map((s) => s.register),
    ["formal", "neutral", "informal"],
  );
  assert.equal(set.wasSpanishInput, true);
});

test("requestSuggestions returns a valid set with formal present", async () => {
  const set = await requestSuggestions("hi", undefined, {
    callModel: async () => jsonResponse(validSet),
  });
  assert.ok(set.suggestions.some((s) => s.register === "formal"));
});

test("isAlreadyOptimal passes through on the formal suggestion (FR-016)", async () => {
  const set = await requestSuggestions("Thank you very much.", undefined, {
    callModel: async () =>
      jsonResponse({
        suggestions: [
          {
            register: "formal",
            text: "Thank you very much.",
            explanation: "Ya es la forma estándar.",
            isAlreadyOptimal: true,
          },
        ],
        wasSpanishInput: false,
      }),
  });
  const formal = set.suggestions.find((s) => s.register === "formal");
  assert.equal(formal.isAlreadyOptimal, true);
});

test("isAlreadyOptimal is forced false on non-formal registers", async () => {
  const set = await requestSuggestions("hi", undefined, {
    callModel: async () =>
      jsonResponse({
        suggestions: [
          { register: "formal", text: "Hello.", explanation: "f", isAlreadyOptimal: false },
          { register: "informal", text: "Hey!", explanation: "i", isAlreadyOptimal: true },
        ],
        wasSpanishInput: false,
      }),
  });
  const informal = set.suggestions.find((s) => s.register === "informal");
  assert.equal(informal.isAlreadyOptimal, false);
});

test("requestSuggestions rejects a response missing the formal suggestion", async () => {
  await assert.rejects(
    requestSuggestions("hi", undefined, {
      callModel: async () =>
        jsonResponse({
          suggestions: [{ register: "informal", text: "x", explanation: "y" }],
          wasSpanishInput: false,
        }),
    }),
    GenerationFailedError,
  );
});

test("requestSuggestions rejects an invalid register", async () => {
  await assert.rejects(
    requestSuggestions("hi", undefined, {
      callModel: async () =>
        jsonResponse({
          suggestions: [{ register: "casual", text: "x", explanation: "y" }],
          wasSpanishInput: false,
        }),
    }),
    GenerationFailedError,
  );
});

test("requestSuggestions rejects empty text/explanation", async () => {
  await assert.rejects(
    requestSuggestions("hi", undefined, {
      callModel: async () =>
        jsonResponse({
          suggestions: [{ register: "formal", text: "  ", explanation: "y" }],
          wasSpanishInput: false,
        }),
    }),
    GenerationFailedError,
  );
});

test("requestSuggestions maps a timeout to GenerationTimeoutError", async () => {
  await assert.rejects(
    requestSuggestions("hi", undefined, {
      timeoutMs: 10,
      callModel: ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    }),
    GenerationTimeoutError,
  );
});

test("requestSuggestions maps a provider error to GenerationFailedError", async () => {
  await assert.rejects(
    requestSuggestions("hi", undefined, {
      callModel: async () => {
        throw new Error("provider exploded");
      },
    }),
    GenerationFailedError,
  );
});

test("requestSuggestions rejects unparseable model output", async () => {
  await assert.rejects(
    requestSuggestions("hi", undefined, {
      callModel: async () => ({ text: "not json {" }),
    }),
    GenerationFailedError,
  );
});

test("validateSuggestionSet rejects duplicate registers", () => {
  assert.throws(
    () =>
      validateSuggestionSet({
        suggestions: [
          { register: "formal", text: "a", explanation: "x" },
          { register: "formal", text: "b", explanation: "y" },
        ],
        wasSpanishInput: false,
      }),
    GenerationFailedError,
  );
});
