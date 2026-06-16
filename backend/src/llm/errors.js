import { HttpError } from "../httpError.js";

// The generation call exceeded the timeout (FR-012).
export class GenerationTimeoutError extends HttpError {
  constructor(cause) {
    super(
      504,
      "GENERATION_TIMEOUT",
      "La generación tardó demasiado. Por favor intenta de nuevo.",
      cause,
    );
    this.name = "GenerationTimeoutError";
  }
}

// The provider failed, was unavailable, rate-limited, or returned an
// invalid/malformed result that did not pass validation (FR-012).
export class GenerationFailedError extends HttpError {
  constructor(cause) {
    super(
      502,
      "GENERATION_FAILED",
      "No pudimos generar sugerencias en este momento. Por favor intenta de nuevo.",
      cause,
    );
    this.name = "GenerationFailedError";
  }
}
