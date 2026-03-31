import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readConfigSync, writeConfig } from "./config.js";
import { PublishableError } from "./errors.js";

function makeTempDir() {
  return join(
    tmpdir(),
    `publishable-cfg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

describe("readConfigSync", () => {
  it("returns {} when file does not exist", () => {
    const result = readConfigSync("/nonexistent/path/config.json");
    expect(result).toEqual({});
  });

  it("returns parsed config for valid JSON", async () => {
    const dir = makeTempDir();
    const configPath = join(dir, "config.json");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ vault: "/my/vault" }),
      "utf-8",
    );
    const result = readConfigSync(configPath);
    expect(result).toEqual({ vault: "/my/vault" });
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("throws STORAGE_ERROR for invalid JSON", async () => {
    const dir = makeTempDir();
    const configPath = join(dir, "config.json");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(configPath, "not valid json", "utf-8");
    expect(() => readConfigSync(configPath)).toThrow(
      expect.objectContaining({
        code: "STORAGE_ERROR",
      } as Partial<PublishableError>),
    );
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("writeConfig", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  });

  it("creates directory and writes valid JSON", async () => {
    dir = makeTempDir();
    const configPath = join(dir, "subdir", "config.json");
    await writeConfig(configPath, { vault: "/some/vault" });
    const raw = await fs.readFile(configPath, "utf-8");
    expect(JSON.parse(raw)).toEqual({ vault: "/some/vault" });
  });
});
