import { requestSuggestions } from "./geminiClient.js";

// The ONLY public interface of the LLM integration module. Routes and business
// logic depend on this function alone — never on provider types or prompts
// (Constitution Principle III).
//
// generateSuggestions(phrase, context) -> Promise<SuggestionSet>
//   throws GenerationTimeoutError | GenerationFailedError
export function generateSuggestions(phrase, context) {
  return requestSuggestions(phrase, context);
}
