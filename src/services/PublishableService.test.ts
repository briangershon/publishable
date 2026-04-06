import { describe, it, expect, beforeEach } from "vitest";
import { PublishableService } from "./PublishableService.js";
import { InMemoryFileSystem } from "../filesystem/InMemoryFileSystem.js";

const validMarkdown = `---
title: "My Post"
slug: my-post
summary: "A short summary."
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
    });

    it("increments version on second update", async () => {
      await svc.update("my-post", validMarkdown, {});
      const result = await svc.update("my-post", validMarkdown, {
        message: "second update",
      });
      expect(result.current_version).toBe(2);
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
---
# My Post

Body content.
`;
      const result = await svc.update("my-post", noTitle, {});
      expect(result.handle).toBe("my-post");
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
    it("returns valid for correct content with schema", async () => {
      const result = await svc.validate(validMarkdown, "blog");
      expect(result.valid).toBe(true);
    });

    it("returns invalid without throwing for bad content with schema", async () => {
      const result = await svc.validate(
        "---\ntitle: Test\n---\nno heading here",
        "blog",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns valid without validating when no schema provided", async () => {
      const result = await svc.validate(
        "---\ntitle: Test\n---\nno heading here",
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.schema).toBeUndefined();
    });
  });

  describe("export()", () => {
    beforeEach(async () => {
      await svc.update("my-post", validMarkdown, {});
    });

    it("throws SCHEMA_VALIDATION_FAILED for invalid content when schema provided", async () => {
      await svc.update(
        "bad-post",
        "---\ntitle: Test\n---\nNo heading here",
        {},
      );
      await expect(
        svc.export("bad-post", { format: "md", schema: "blog" }),
      ).rejects.toMatchObject({ code: "SCHEMA_VALIDATION_FAILED" });
    });

    it("exports without validating when no schema provided", async () => {
      await svc.update("body-only-post", "Just some body text.", {});
      const result = await svc.export("body-only-post", { format: "body" });
      expect(result).toContain("Just some body text.");
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

  describe("rename()", () => {
    it("renames a publishable and updates the handle in metadata", async () => {
      await svc.update("old-name", validMarkdown, {});
      const result = await svc.rename("old-name", "new-name");
      expect(result.handle).toBe("new-name");
      expect(result.current_version).toBe(1);
    });

    it("makes the old handle inaccessible after rename", async () => {
      await svc.update("old-name", validMarkdown, {});
      await svc.rename("old-name", "new-name");
      await expect(svc.get("old-name")).rejects.toMatchObject({
        code: "PUBLISHABLE_NOT_FOUND",
      });
    });

    it("preserves version history after rename", async () => {
      await svc.update("old-name", validMarkdown, {});
      await svc.update("old-name", validMarkdown, { message: "v2" });
      await svc.rename("old-name", "new-name");
      const versions = await svc.versions("new-name");
      expect(versions.versions).toEqual([1, 2]);
      expect(versions.current_version).toBe(2);
    });

    it("throws PUBLISHABLE_NOT_FOUND for unknown handle", async () => {
      await expect(svc.rename("nonexistent", "new-name")).rejects.toMatchObject(
        { code: "PUBLISHABLE_NOT_FOUND" },
      );
    });

    it("throws HANDLE_ALREADY_EXISTS when new handle is taken", async () => {
      await svc.update("post-a", validMarkdown, {});
      await svc.update("post-b", validMarkdown, {});
      await expect(svc.rename("post-a", "post-b")).rejects.toMatchObject({
        code: "HANDLE_ALREADY_EXISTS",
      });
    });

    it("throws INVALID_HANDLE for bad new handle", async () => {
      await svc.update("my-post", validMarkdown, {});
      await expect(svc.rename("my-post", "Bad_Name")).rejects.toMatchObject({
        code: "INVALID_HANDLE",
      });
    });
  });

  describe("delete()", () => {
    it("deletes a publishable and returns deleted: true", async () => {
      await svc.update("my-post", validMarkdown, {});
      const result = await svc.delete("my-post");
      expect(result).toEqual({ handle: "my-post", deleted: true });
    });

    it("makes the handle inaccessible after deletion", async () => {
      await svc.update("my-post", validMarkdown, {});
      await svc.delete("my-post");
      await expect(svc.get("my-post")).rejects.toMatchObject({
        code: "PUBLISHABLE_NOT_FOUND",
      });
    });

    it("removes the handle from list() after deletion", async () => {
      await svc.update("post-a", validMarkdown, {});
      await svc.update("post-b", validMarkdown, {});
      await svc.delete("post-a");
      const list = await svc.list();
      expect(list.map((s) => s.handle)).toEqual(["post-b"]);
    });

    it("throws PUBLISHABLE_NOT_FOUND for unknown handle", async () => {
      await expect(svc.delete("nonexistent")).rejects.toMatchObject({
        code: "PUBLISHABLE_NOT_FOUND",
      });
    });

    it("throws INVALID_HANDLE for bad handle", async () => {
      await expect(svc.delete("Bad_Handle")).rejects.toMatchObject({
        code: "INVALID_HANDLE",
      });
    });
  });

  describe("schemaShow()", () => {
    it("returns name and schema object for an existing schema", async () => {
      const result = await svc.schemaShow("blog");
      expect(result.name).toBe("blog");
      expect(result.schema).toBeDefined();
      expect(typeof result.schema).toBe("object");
    });

    it("throws SCHEMA_NOT_FOUND for a missing schema", async () => {
      await expect(svc.schemaShow("nonexistent")).rejects.toMatchObject({
        code: "SCHEMA_NOT_FOUND",
      });
    });

    it("throws VAULT_NOT_INITIALIZED when vault does not exist", async () => {
      const uninitSvc = new PublishableService(
        "/nonexistent",
        new InMemoryFileSystem(),
      );
      await expect(uninitSvc.schemaShow("blog")).rejects.toMatchObject({
        code: "VAULT_NOT_INITIALIZED",
      });
    });
  });

  describe("schemaList()", () => {
    it("returns built-in schemas with source=default after init", async () => {
      const result = await svc.schemaList();
      const names = result.schemas.map((s) => s.name);
      expect(names).toContain("blog");
      expect(names).toHaveLength(1);
      expect(result.schemas.find((s) => s.name === "blog")?.source).toBe(
        "default",
      );
    });

    it("returns sorted schema entries", async () => {
      const result = await svc.schemaList();
      const sorted = [...result.schemas].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      expect(result.schemas).toEqual(sorted);
    });

    it("returns built-in defaults even when schemas directory does not exist", async () => {
      const emptyFs = new InMemoryFileSystem();
      const emptySvc = new PublishableService("/vault", emptyFs);
      await emptyFs.mkdir("/vault", { recursive: true });
      const result = await emptySvc.schemaList();
      const names = result.schemas.map((s) => s.name);
      expect(names).toContain("blog");
      expect(result.schemas.every((s) => s.source === "default")).toBe(true);
    });

    it("marks customized built-in schema as custom", async () => {
      await svc.schemaCustomize("blog");
      const result = await svc.schemaList();
      expect(result.schemas.find((s) => s.name === "blog")?.source).toBe(
        "custom",
      );
    });

    it("includes custom non-built-in schemas", async () => {
      const validSchema = JSON.stringify({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "Newsletter",
        type: "object",
      });
      await svc.schemaCreate("newsletter", validSchema);
      const result = await svc.schemaList();
      const entry = result.schemas.find((s) => s.name === "newsletter");
      expect(entry?.source).toBe("custom");
    });

    it("throws VAULT_NOT_INITIALIZED when vault does not exist", async () => {
      const uninitSvc = new PublishableService(
        "/nonexistent",
        new InMemoryFileSystem(),
      );
      await expect(uninitSvc.schemaList()).rejects.toMatchObject({
        code: "VAULT_NOT_INITIALIZED",
      });
    });
  });

  describe("schemaCreate()", () => {
    const validSchema = JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Flabber",
      type: "object",
      required: ["title", "flabber"],
      properties: {
        title: { type: "string" },
        flabber: { type: "string" },
      },
    });

    it("creates a new schema and returns created: true", async () => {
      const result = await svc.schemaCreate("flabber", validSchema);
      expect(result).toEqual({ name: "flabber", created: true });
    });

    it("schema is listable after creation", async () => {
      await svc.schemaCreate("flabber", validSchema);
      const list = await svc.schemaList();
      expect(list.schemas.map((s) => s.name)).toContain("flabber");
    });

    it("throws SCHEMA_ALREADY_EXISTS when schema already exists", async () => {
      await svc.schemaCreate("flabber", validSchema);
      await expect(
        svc.schemaCreate("flabber", validSchema),
      ).rejects.toMatchObject({
        code: "SCHEMA_ALREADY_EXISTS",
      });
    });

    it("throws STORAGE_ERROR for invalid JSON", async () => {
      await expect(svc.schemaCreate("bad", "not json")).rejects.toMatchObject({
        code: "STORAGE_ERROR",
      });
    });

    it("throws INVALID_SCHEMA when JSON is not a valid JSON Schema", async () => {
      await expect(
        svc.schemaCreate("bad", JSON.stringify({ type: 42 })),
      ).rejects.toMatchObject({ code: "INVALID_SCHEMA" });
    });

    it("throws VAULT_NOT_INITIALIZED when vault does not exist", async () => {
      const uninitSvc = new PublishableService(
        "/nonexistent",
        new InMemoryFileSystem(),
      );
      await expect(
        uninitSvc.schemaCreate("flabber", validSchema),
      ).rejects.toMatchObject({
        code: "VAULT_NOT_INITIALIZED",
      });
    });
  });

  describe("schemaUpdate()", () => {
    const v1 = JSON.stringify({ title: "V1", type: "object" });
    const v2 = JSON.stringify({ title: "V2", type: "object" });

    it("updates an existing schema and returns updated: true", async () => {
      await svc.schemaCreate("flabber", v1);
      const result = await svc.schemaUpdate("flabber", v2);
      expect(result).toEqual({ name: "flabber", updated: true });
    });

    it("throws SCHEMA_NOT_FOUND when schema does not exist", async () => {
      await expect(svc.schemaUpdate("nonexistent", v1)).rejects.toMatchObject({
        code: "SCHEMA_NOT_FOUND",
      });
    });

    it("throws STORAGE_ERROR for invalid JSON", async () => {
      await svc.schemaCreate("flabber", v1);
      await expect(
        svc.schemaUpdate("flabber", "not json"),
      ).rejects.toMatchObject({
        code: "STORAGE_ERROR",
      });
    });

    it("throws INVALID_SCHEMA when JSON is not a valid JSON Schema", async () => {
      await svc.schemaCreate("flabber", v1);
      await expect(
        svc.schemaUpdate("flabber", JSON.stringify({ type: 42 })),
      ).rejects.toMatchObject({ code: "INVALID_SCHEMA" });
    });

    it("throws VAULT_NOT_INITIALIZED when vault does not exist", async () => {
      const uninitSvc = new PublishableService(
        "/nonexistent",
        new InMemoryFileSystem(),
      );
      await expect(uninitSvc.schemaUpdate("flabber", v1)).rejects.toMatchObject(
        {
          code: "VAULT_NOT_INITIALIZED",
        },
      );
    });
  });

  describe("schemaCustomize()", () => {
    it("writes a built-in schema to disk and returns name and path", async () => {
      const result = await svc.schemaCustomize("blog");
      expect(result.name).toBe("blog");
      expect(result.path).toContain("blog.json");
    });

    it("schema is now marked custom in schemaList", async () => {
      await svc.schemaCustomize("blog");
      const list = await svc.schemaList();
      expect(list.schemas.find((s) => s.name === "blog")?.source).toBe(
        "custom",
      );
    });

    it("throws SCHEMA_ALREADY_EXISTS when file already exists", async () => {
      await svc.schemaCustomize("blog");
      await expect(svc.schemaCustomize("blog")).rejects.toMatchObject({
        code: "SCHEMA_ALREADY_EXISTS",
      });
    });

    it("overwrites when force=true", async () => {
      await svc.schemaCustomize("blog");
      const result = await svc.schemaCustomize("blog", true);
      expect(result.name).toBe("blog");
    });

    it("throws SCHEMA_NOT_FOUND for non-built-in name", async () => {
      await expect(svc.schemaCustomize("nonexistent")).rejects.toMatchObject({
        code: "SCHEMA_NOT_FOUND",
      });
    });

    it("throws VAULT_NOT_INITIALIZED when vault does not exist", async () => {
      const uninitSvc = new PublishableService(
        "/nonexistent",
        new InMemoryFileSystem(),
      );
      await expect(uninitSvc.schemaCustomize("blog")).rejects.toMatchObject({
        code: "VAULT_NOT_INITIALIZED",
      });
    });
  });
});
