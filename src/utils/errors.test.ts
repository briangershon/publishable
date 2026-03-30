import { describe, it, expect } from "vitest";
import { PublishableError } from "./errors.js";

describe("PublishableError", () => {
  it("stores code and message", () => {
    const err = new PublishableError("INVALID_HANDLE", "bad handle");
    expect(err.code).toBe("INVALID_HANDLE");
    expect(err.message).toBe("bad handle");
    expect(err.name).toBe("PublishableError");
    expect(err).toBeInstanceOf(Error);
  });

  it("stores optional details", () => {
    const details = [{ path: "slug", code: "INVALID", message: "bad slug" }];
    const err = new PublishableError(
      "SCHEMA_VALIDATION_FAILED",
      "validation failed",
      details,
    );
    expect(err.details).toEqual(details);
  });

  it("details is undefined when not provided", () => {
    const err = new PublishableError("FILE_NOT_FOUND", "not found");
    expect(err.details).toBeUndefined();
  });
});
