import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { outputSuccess, outputError } from "./output.js";
import { PublishableError } from "./errors.js";

describe("outputSuccess()", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("produces JSON envelope with ok: true", () => {
    outputSuccess({ foo: "bar" }, true);
    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.ok).toBe(true);
    expect(output.data).toEqual({ foo: "bar" });
  });

  it("formats PublishableSummary in human mode", () => {
    outputSuccess(
      {
        handle: "my-post",
        current_version: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      false,
    );
    const output = logSpy.mock.calls.map((c: unknown[]) => c[0]).join("\n");
    expect(output).toContain("my-post");
    expect(output).toContain("1");
  });

  it("prints 'No publishables found.' for empty array", () => {
    outputSuccess([], false);
    expect(logSpy.mock.calls[0][0]).toBe("No publishables found.");
  });
});

describe("outputError()", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: number | string | null) => {
        throw new Error("process.exit called");
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("produces JSON error envelope", () => {
    const err = new PublishableError("INVALID_HANDLE", "bad handle");
    expect(() => outputError(err, true)).toThrow("process.exit called");
    const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(output.ok).toBe(false);
    expect(output.error.code).toBe("INVALID_HANDLE");
    expect(output.error.message).toBe("bad handle");
  });

  it("includes details in JSON when present", () => {
    const details = [{ path: "slug", code: "INVALID", message: "bad slug" }];
    const err = new PublishableError(
      "SCHEMA_VALIDATION_FAILED",
      "validation failed",
      details,
    );
    expect(() => outputError(err, true)).toThrow("process.exit called");
    const output = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(output.error.details).toEqual(details);
  });

  it("outputs human-readable error", () => {
    const err = new PublishableError("FILE_NOT_FOUND", "file missing");
    expect(() => outputError(err, false)).toThrow("process.exit called");
    expect(errorSpy.mock.calls[0][0]).toContain("FILE_NOT_FOUND");
    expect(errorSpy.mock.calls[0][0]).toContain("file missing");
  });

  it("calls process.exit(1)", () => {
    const err = new PublishableError("STORAGE_ERROR", "disk full");
    expect(() => outputError(err, false)).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
