import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../src/app.js";
import {
  GenerationTimeoutError,
  GenerationFailedError,
} from "../src/llm/errors.js";

const sampleSet = {
  suggestions: [
    { register: "formal", text: "Formal text", explanation: "Explicación formal" },
  ],
  wasSpanishInput: false,
};

function appWith(generateSuggestions) {
  return createApp({ generateSuggestions });
}

test("POST /api/suggestions returns 200 with the formal suggestion present", async () => {
  const app = appWith(async () => sampleSet);
  const res = await request(app)
    .post("/api/suggestions")
    .send({ phrase: "hello" });

  assert.equal(res.status, 200);
  assert.ok(res.body.suggestions.some((s) => s.register === "formal"));
});

test("empty phrase returns 400 EMPTY_PHRASE without calling the LLM", async () => {
  let called = false;
  const app = appWith(async () => {
    called = true;
    return sampleSet;
  });
  const res = await request(app).post("/api/suggestions").send({ phrase: "   " });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "EMPTY_PHRASE");
  assert.equal(called, false);
});

test("over-long phrase returns 400 PHRASE_TOO_LONG", async () => {
  const app = appWith(async () => sampleSet);
  const res = await request(app)
    .post("/api/suggestions")
    .send({ phrase: "x".repeat(301) });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "PHRASE_TOO_LONG");
});

test("generation timeout maps to 504 GENERATION_TIMEOUT", async () => {
  const app = appWith(async () => {
    throw new GenerationTimeoutError();
  });
  const res = await request(app).post("/api/suggestions").send({ phrase: "hello" });

  assert.equal(res.status, 504);
  assert.equal(res.body.error.code, "GENERATION_TIMEOUT");
});

test("generation failure maps to 502 GENERATION_FAILED and leaks no detail", async () => {
  const app = appWith(async () => {
    throw new GenerationFailedError("raw provider payload should not leak");
  });
  const res = await request(app).post("/api/suggestions").send({ phrase: "hello" });

  assert.equal(res.status, 502);
  assert.equal(res.body.error.code, "GENERATION_FAILED");
  assert.doesNotMatch(JSON.stringify(res.body), /raw provider payload/);
});

test("wasSpanishInput flag is passed through to the response", async () => {
  const app = appWith(async () => ({
    suggestions: sampleSet.suggestions,
    wasSpanishInput: true,
  }));
  const res = await request(app)
    .post("/api/suggestions")
    .send({ phrase: "quería saber si puedes venir" });

  assert.equal(res.status, 200);
  assert.equal(res.body.wasSpanishInput, true);
});

test("context is forwarded to generateSuggestions", async () => {
  let received;
  const app = appWith(async (phrase, context) => {
    received = { phrase, context };
    return sampleSet;
  });
  await request(app)
    .post("/api/suggestions")
    .send({ phrase: "hello", context: "correo formal" });

  assert.equal(received.context, "correo formal");
});

test("empty context is treated as absent (undefined)", async () => {
  let received;
  const app = appWith(async (phrase, context) => {
    received = { phrase, context };
    return sampleSet;
  });
  await request(app)
    .post("/api/suggestions")
    .send({ phrase: "hello", context: "   " });

  assert.equal(received.context, undefined);
});
