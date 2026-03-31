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

  beforeEach(async () => {
    vaultRoot = makeTempDir();
    svc = new PublishableService(vaultRoot);
    await svc.init();
  });

  describe("vault not initialized", () => {
    it("throws VAULT_NOT_INITIALIZED when vault directory does not exist", async () => {
      const uninitSvc = new PublishableService(makeTempDir());
      await expect(uninitSvc.list()).rejects.toMatchObject({
        code: "VAULT_NOT_INITIALIZED",
      });
    });
  });

  afterEach(async () => {
    await fs.rm(vaultRoot, { recursive: true, force: true });
  });

  describe("update()", () => {
    it("creates a new publishable at version 1", async () => {
      const result = await svc.update("my-post", validMarkdown, {});
      expect(result.handle).toBe("my-post");
      expect(result.current_version).toBe(1);
      expect(result.title).toBe("My Post");
    });

    it("increments version on second update", async () => {
      await svc.update("my-post", validMarkdown, {});
      const result = await svc.update("my-post", validMarkdown, {
        message: "second update",
      });
      expect(result.current_version).toBe(2);
    });

    it("--title flag overrides file frontmatter title", async () => {
      const result = await svc.update("my-post", validMarkdown, {
        title: "Override Title",
      });
      expect(result.title).toBe("Override Title");
    });

    it("throws INVALID_HANDLE for bad handle", async () => {
      await expect(
        svc.update("Bad_Handle", validMarkdown, {}),
      ).rejects.toMatchObject({ code: "INVALID_HANDLE" });
    });

    it("throws SCHEMA_VALIDATION_FAILED for invalid content", async () => {
      await expect(
        svc.update("my-post", "---\ntitle: Test\n---\nNo heading here", {}),
      ).rejects.toMatchObject({
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
      await expect(svc.update("my-post", noTitle, {})).rejects.toMatchObject({
        code: "SCHEMA_VALIDATION_FAILED",
      });
    });
  });

  describe("list()", () => {
    it("returns empty array with no publishables", async () => {
      expect(await svc.list()).toEqual([]);
    });

    it("returns summaries for all publishables", async () => {
      await svc.update("post-a", validMarkdown, {});
      await svc.update("post-b", validMarkdown, {});
      const list = await svc.list();
      expect(list.map((s) => s.handle).sort()).toEqual(["post-a", "post-b"]);
    });
  });

  describe("get()", () => {
    it("returns summary for existing publishable", async () => {
      await svc.update("my-post", validMarkdown, {});
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
      await svc.update("my-post", validMarkdown, {});
      const version = await svc.current("my-post");
      expect(version.frontmatter.version).toBe(1);
      expect(version.frontmatter.title).toBe("My Post");
    });

    it("returns version 2 after two updates", async () => {
      await svc.update("my-post", validMarkdown, {});
      await svc.update("my-post", validMarkdown, {});
      const version = await svc.current("my-post");
      expect(version.frontmatter.version).toBe(2);
    });
  });

  describe("show()", () => {
    it("returns specific version", async () => {
      await svc.update("my-post", validMarkdown, {});
      await svc.update("my-post", validMarkdown, { message: "v2" });
      const v1 = await svc.show("my-post", 1);
      expect(v1.frontmatter.version).toBe(1);
    });

    it("throws VERSION_NOT_FOUND for missing version", async () => {
      await svc.update("my-post", validMarkdown, {});
      await expect(svc.show("my-post", 99)).rejects.toMatchObject({
        code: "VERSION_NOT_FOUND",
      });
    });
  });

  describe("versions()", () => {
    it("returns all version numbers", async () => {
      await svc.update("my-post", validMarkdown, {});
      await svc.update("my-post", validMarkdown, {});
      const result = await svc.versions("my-post");
      expect(result.versions).toEqual([1, 2]);
      expect(result.current_version).toBe(2);
    });
  });

  describe("revert()", () => {
    it("creates a new version with reverted_from set", async () => {
      await svc.update("my-post", validMarkdown, {});
      const updatedMarkdown = validMarkdown.replace(
        "Body content here.",
        "Updated body.",
      );
      await svc.update("my-post", updatedMarkdown, {});

      const result = await svc.revert("my-post", 1, {});
      expect(result.current_version).toBe(3);

      const v3 = await svc.show("my-post", 3);
      expect(v3.frontmatter.reverted_from).toBe(1);
    });
  });

  describe("validate()", () => {
    it("returns valid for correct content", async () => {
      const result = await svc.validate(validMarkdown);
      expect(result.valid).toBe(true);
    });

    it("returns invalid without throwing for bad content", async () => {
      const result = await svc.validate(
        "---\ntitle: Test\n---\nno heading here",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
