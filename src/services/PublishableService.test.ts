import { describe, it, expect, beforeEach } from "vitest";
import { PublishableService } from "./PublishableService.js";
import { InMemoryFileSystem } from "../filesystem/InMemoryFileSystem.js";

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
  const vaultRoot = "/vault";
  let svc: PublishableService;

  beforeEach(async () => {
    svc = new PublishableService(vaultRoot, new InMemoryFileSystem());
    await svc.init();
  });

  describe("vault not initialized", () => {
    it("throws VAULT_NOT_INITIALIZED when vault directory does not exist", async () => {
      const uninitSvc = new PublishableService(
        "/nonexistent",
        new InMemoryFileSystem(),
      );
      await expect(uninitSvc.list()).rejects.toMatchObject({
        code: "VAULT_NOT_INITIALIZED",
      });
    });
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

    it("saves successfully without a title (draft mode)", async () => {
      const noTitle = `---
slug: my-post
summary: "A summary."
tags:
  - test
---
# My Post

Body content.
`;
      const result = await svc.update("my-post", noTitle, {});
      expect(result.handle).toBe("my-post");
      expect(result.title).toBe("");
    });

    it("saves successfully with invalid schema content (no validation at update)", async () => {
      const result = await svc.update(
        "my-post",
        "---\ntitle: Test\n---\nNo heading here",
        {},
      );
      expect(result.handle).toBe("my-post");
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

    it("returns handles in sorted order", async () => {
      for (const handle of ["zebra-post", "alpha-post", "middle-post"]) {
        await svc.update(handle, validMarkdown, {});
      }
      const list = await svc.list();
      expect(list.map((s) => s.handle)).toEqual([
        "alpha-post",
        "middle-post",
        "zebra-post",
      ]);
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

    it("preserves body content and frontmatter fields through storage round-trip", async () => {
      await svc.update("my-post", validMarkdown, {});
      const version = await svc.current("my-post");
      expect(version.body.trim()).toBe("# My Post\n\nBody content here.");
      expect(version.frontmatter.slug).toBe("my-post");
      expect(version.frontmatter.summary).toBe("A short summary.");
      expect(version.frontmatter.tags).toEqual(["test"]);
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

    it("throws PUBLISHABLE_NOT_FOUND for unknown handle", async () => {
      await expect(svc.versions("nonexistent")).rejects.toMatchObject({
        code: "PUBLISHABLE_NOT_FOUND",
      });
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

  describe("export()", () => {
    beforeEach(async () => {
      await svc.update("my-post", validMarkdown, {});
    });

    it("throws SCHEMA_VALIDATION_FAILED for invalid content", async () => {
      await svc.update(
        "bad-post",
        "---\ntitle: Test\n---\nNo heading here",
        {},
      );
      await expect(
        svc.export("bad-post", { format: "md" }),
      ).rejects.toMatchObject({ code: "SCHEMA_VALIDATION_FAILED" });
    });

    it("format md returns content-only frontmatter + body", async () => {
      const result = await svc.export("my-post", { format: "md" });
      expect(result).toContain("title:");
      expect(result).toContain("slug:");
      expect(result).toContain("summary:");
      expect(result).toContain("# My Post");
      expect(result).not.toContain("version:");
      expect(result).not.toContain("message:");
      expect(result).not.toContain("created_at:");
    });

    it("format body returns only the markdown body", async () => {
      const result = await svc.export("my-post", { format: "body" });
      expect(result).toBe("# My Post\n\nBody content here.\n");
      expect(result).not.toContain("---");
    });

    it("format json returns content fields as plain JSON", async () => {
      const result = await svc.export("my-post", { format: "json" });
      const parsed = JSON.parse(result) as Record<string, unknown>;
      expect(parsed.title).toBe("My Post");
      expect(parsed.slug).toBe("my-post");
      expect(parsed.summary).toBe("A short summary.");
      expect(parsed.body).toContain("# My Post");
      expect(parsed).not.toHaveProperty("version");
      expect(parsed).not.toHaveProperty("message");
    });

    it("throws PUBLISHABLE_NOT_FOUND for unknown handle", async () => {
      await expect(
        svc.export("nonexistent", { format: "md" }),
      ).rejects.toMatchObject({ code: "PUBLISHABLE_NOT_FOUND" });
    });
  });
});
