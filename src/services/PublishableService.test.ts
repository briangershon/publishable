import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { PublishableService } from "./PublishableService.js";

function makeTempDir() {
  return join(
    tmpdir(),
    `publishable-svc-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
}

const validMarkdown = `---
title: "My Post"
slug: my-post
summary: "A short summary."
tags:
  - test
---
# My Post

Body content here.
`;

describe("PublishableService", () => {
  let vaultRoot: string;
  let svc: PublishableService;
  let tempFile: string;

  beforeEach(async () => {
    vaultRoot = makeTempDir();
    svc = new PublishableService(vaultRoot);
    await svc.init();
    tempFile = join(vaultRoot, "input.md");
  });

  afterEach(async () => {
    await fs.rm(vaultRoot, { recursive: true, force: true });
  });

  describe("update()", () => {
    it("creates a new publishable at version 1", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      const result = await svc.update("my-post", tempFile, {});
      expect(result.handle).toBe("my-post");
      expect(result.current_version).toBe(1);
      expect(result.title).toBe("My Post");
    });

    it("increments version on second update", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      const result = await svc.update("my-post", tempFile, {
        message: "second update",
      });
      expect(result.current_version).toBe(2);
    });

    it("--title flag overrides file frontmatter title", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      const result = await svc.update("my-post", tempFile, {
        title: "Override Title",
      });
      expect(result.title).toBe("Override Title");
    });

    it("throws INVALID_HANDLE for bad handle", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await expect(
        svc.update("Bad_Handle", tempFile, {}),
      ).rejects.toMatchObject({ code: "INVALID_HANDLE" });
    });

    it("throws SCHEMA_VALIDATION_FAILED for invalid content", async () => {
      await fs.writeFile(
        tempFile,
        "---\ntitle: Test\n---\nNo heading here",
        "utf-8",
      );
      await expect(svc.update("my-post", tempFile, {})).rejects.toMatchObject({
        code: "SCHEMA_VALIDATION_FAILED",
      });
    });

    it("throws SCHEMA_VALIDATION_FAILED when no title on first create", async () => {
      const noTitle = `---
slug: my-post
summary: "A summary."
tags:
  - test
---
# My Post

Body content.
`;
      await fs.writeFile(tempFile, noTitle, "utf-8");
      await expect(svc.update("my-post", tempFile, {})).rejects.toMatchObject({
        code: "SCHEMA_VALIDATION_FAILED",
      });
    });

    it("throws FILE_NOT_FOUND for missing file", async () => {
      await expect(
        svc.update("my-post", join(vaultRoot, "missing.md"), {}),
      ).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    });
  });

  describe("list()", () => {
    it("returns empty array with no publishables", async () => {
      expect(await svc.list()).toEqual([]);
    });

    it("returns summaries for all publishables", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("post-a", tempFile, {});
      await svc.update("post-b", tempFile, {});
      const list = await svc.list();
      expect(list.map((s) => s.handle).sort()).toEqual(["post-a", "post-b"]);
    });
  });

  describe("get()", () => {
    it("returns summary for existing publishable", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      const summary = await svc.get("my-post");
      expect(summary.handle).toBe("my-post");
      expect(summary.current_version).toBe(1);
    });

    it("throws PUBLISHABLE_NOT_FOUND for unknown handle", async () => {
      await expect(svc.get("nonexistent")).rejects.toMatchObject({
        code: "PUBLISHABLE_NOT_FOUND",
      });
    });
  });

  describe("current()", () => {
    it("returns the latest version", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      const version = await svc.current("my-post");
      expect(version.frontmatter.version).toBe(1);
      expect(version.frontmatter.title).toBe("My Post");
    });

    it("returns version 2 after two updates", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      await svc.update("my-post", tempFile, {});
      const version = await svc.current("my-post");
      expect(version.frontmatter.version).toBe(2);
    });
  });

  describe("show()", () => {
    it("returns specific version", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      await svc.update("my-post", tempFile, { message: "v2" });
      const v1 = await svc.show("my-post", 1);
      expect(v1.frontmatter.version).toBe(1);
    });

    it("throws VERSION_NOT_FOUND for missing version", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      await expect(svc.show("my-post", 99)).rejects.toMatchObject({
        code: "VERSION_NOT_FOUND",
      });
    });
  });

  describe("versions()", () => {
    it("returns all version numbers", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});
      await svc.update("my-post", tempFile, {});
      const result = await svc.versions("my-post");
      expect(result.versions).toEqual([1, 2]);
      expect(result.current_version).toBe(2);
    });
  });

  describe("revert()", () => {
    it("creates a new version with reverted_from set", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});

      const updatedMarkdown = validMarkdown.replace(
        "Body content here.",
        "Updated body.",
      );
      await fs.writeFile(tempFile, updatedMarkdown, "utf-8");
      await svc.update("my-post", tempFile, {});

      const result = await svc.revert("my-post", 1, {});
      expect(result.current_version).toBe(3);

      const v3 = await svc.show("my-post", 3);
      expect(v3.frontmatter.reverted_from).toBe(1);
    });
  });

  describe("validate()", () => {
    it("returns valid for correct file", async () => {
      await fs.writeFile(tempFile, validMarkdown, "utf-8");
      const result = await svc.validate(tempFile);
      expect(result.valid).toBe(true);
    });

    it("returns invalid without throwing for bad file", async () => {
      await fs.writeFile(
        tempFile,
        "---\ntitle: Test\n---\nno heading here",
        "utf-8",
      );
      const result = await svc.validate(tempFile);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
