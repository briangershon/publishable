import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCommand } from "./validate.js";

const { mockCurrent, mockValidateVersion } = vi.hoisted(() => ({
  mockCurrent: vi.fn(),
  mockValidateVersion: vi.fn(),
}));

vi.mock("../services/PublishableService.js", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  PublishableService: vi.fn(function () {
    return { current: mockCurrent, validateVersion: mockValidateVersion };
  }),
}));

const fakeVersion = {
  frontmatter: { version: 1, message: "init", created_at: "" },
  body: "body",
};

describe("validateCommand", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);
    mockCurrent.mockResolvedValue(fakeVersion);
    mockValidateVersion.mockResolvedValue({ valid: true, errors: [] });
  });

  it("throws SCHEMA_REQUIRED when neither --schema nor --no-schema is provided", async () => {
    await expect(validateCommand("my-post", {})).rejects.toMatchObject({
      code: "SCHEMA_REQUIRED",
    });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("passes schema name to service when --schema is provided", async () => {
    await validateCommand("my-post", { schema: "blog" });
    expect(mockValidateVersion).toHaveBeenCalledWith(fakeVersion, "blog");
  });

  it("passes undefined schema to service when --no-schema is provided", async () => {
    await validateCommand("my-post", { noSchema: true });
    expect(mockValidateVersion).toHaveBeenCalledWith(fakeVersion, undefined);
  });
});
