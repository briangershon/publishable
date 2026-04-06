import type { ErrorCode, ValidationError } from "../types.js";

export class PublishableError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ValidationError[],
  ) {
    super(message);
    this.name = "PublishableError";
  }
}
