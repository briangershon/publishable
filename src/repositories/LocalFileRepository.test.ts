import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { LocalFileRepository } from "./LocalFileRepository.js";
import type { PublishableMeta, PublishableVersion } from "../types.js";

function makeTempDir() {
  return join(
    tmpdir(),
    `publishable-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

const sampleMeta: PublishableMeta = {
  handle: "my-post",
  title: "My Post",
  current_version: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const sampleVersion: PublishableVersion = {
  frontmatter: {
    version: 1,
    schema: "publishable/v1",
    message: "",
    created_at: "2026-01-01T00:00:00.000Z",
    title: "My Post",
    slug: "my-post",
    summary: "A summary.",
    tags: ["test"],
  },
  body: "# My Post\n\nContent here.",
};

describe("LocalFileRepository", () => {
  let vaultRoot: string;
  let repo: LocalFileRepository;

  beforeEach(async () => {
    vaultRoot = makeTempDir();
    await fs.mkdir(vaultRoot, { recursive: true });
    repo = new LocalFileRepository(vaultRoot);
  });

  afterEach(async () => {
    await fs.rm(vaultRoot, { recursive: true, force: true });
  });

  describe("writeMeta() / readMeta()", () => {
    it("round-trips metadata", async () => {
      await repo.writeMeta(sampleMeta);
      const read = await repo.readMeta("my-post");
      expect(read.handle).toBe(sampleMeta.handle);
      expect(read.title).toBe(sampleMeta.title);
      expect(read.current_version).toBe(sampleMeta.current_version);
    });

    it("creates parent directory automatically", async () => {
      await repo.writeMeta(sampleMeta);
      const stat = await fs.stat(join(vaultRoot, "publishables", "my-post"));
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe("readMeta() errors", () => {
    it("throws PUBLISHABLE_NOT_FOUND for missing handle", async () => {
      await expect(repo.readMeta("nonexistent")).rejects.toMatchObject({
        code: "PUBLISHABLE_NOT_FOUND",
      });
    });
  });

  describe("writeVersion() / readVersion()", () => {
    it("round-trips a version", async () => {
      await repo.writeMeta(sampleMeta);
      await repo.writeVersion("my-post", sampleVersion);
      const read = await repo.readVersion("my-post", 1);
      expect(read.frontmatter.version).toBe(1);
      expect(read.frontmatter.title).toBe("My Post");
      expect(read.body.trim()).toBe("# My Post\n\nContent here.");
    });
  });

  describe("readVersion() errors", () => {
    it("throws VERSION_NOT_FOUND for missing version", async () => {
      await repo.writeMeta(sampleMeta);
      await expect(repo.readVersion("my-post", 99)).rejects.toMatchObject({
        code: "VERSION_NOT_FOUND",
      });
    });
  });

  describe("listVersionNumbers()", () => {
    it("returns empty array when no versions exist", async () => {
      await repo.writeMeta(sampleMeta);
      expect(await repo.listVersionNumbers("my-post")).toEqual([]);
    });

    it("returns sorted version numbers", async () => {
      await repo.writeMeta(sampleMeta);
      for (const v of [3, 1, 2]) {
        await repo.writeVersion("my-post", {
          ...sampleVersion,
          frontmatter: { ...sampleVersion.frontmatter, version: v },
        });
      }
      expect(await repo.listVersionNumbers("my-post")).toEqual([1, 2, 3]);
    });

    it("throws PUBLISHABLE_NOT_FOUND for missing handle", async () => {
      await expect(
        repo.listVersionNumbers("nonexistent"),
      ).rejects.toMatchObject({ code: "PUBLISHABLE_NOT_FOUND" });
    });
  });

  describe("listHandles()", () => {
    it("returns empty array when vault is empty", async () => {
      expect(await repo.listHandles()).toEqual([]);
    });

    it("returns sorted handle names", async () => {
      for (const handle of ["zebra-post", "alpha-post", "middle-post"]) {
        await repo.writeMeta({ ...sampleMeta, handle });
      }
      expect(await repo.listHandles()).toEqual([
        "alpha-post",
        "middle-post",
        "zebra-post",
      ]);
    });
  });
});
