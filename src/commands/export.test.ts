import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportCommand } from "./export.js";

const { mockExport } = vi.hoisted(() => ({
  mockExport: vi.fn(),
}));

vi.mock("../services/PublishableService.js", () => ({
  // eslint-disable-next-line prefer-arrow-callback
  PublishableService: vi.fn(function () {
    return { export: mockExport };
  }),
}));

describe("exportCommand", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation((() => {}) as () => never);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    mockExport.mockResolvedValue("exported content\n");
  });

  it("throws SCHEMA_REQUIRED when neither --schema nor --no-schema is provided", async () => {
    await expect(exportCommand("my-post", {})).rejects.toMatchObject({
      code: "SCHEMA_REQUIRED",
    });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("passes schema name to service when --schema is provided", async () => {
    await exportCommand("my-post", { schema: "blog" });
    expect(mockExport).toHaveBeenCalledWith(
      "my-post",
      expect.objectContaining({ schema: "blog" }),
    );
  });

  it("passes undefined schema to service when --no-schema is provided", async () => {
    await exportCommand("my-post", { noSchema: true });
    expect(mockExport).toHaveBeenCalledWith(
      "my-post",
      expect.objectContaining({ schema: undefined }),
    );
  });
});
