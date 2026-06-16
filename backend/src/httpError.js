// Base error carrying everything the central error handler needs to build the
// documented response shape { error: { code, message } }.
// `userMessage` is safe to show verbatim (Spanish, no internal detail).
export class HttpError extends Error {
  constructor(status, code, userMessage, cause) {
    super(userMessage);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.userMessage = userMessage;
    if (cause !== undefined) this.cause = cause;
  }
}
