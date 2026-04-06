import { describe, it, expect } from "vitest";
import { ValidationService } from "./ValidationService.js";
import { BLOG_SCHEMA } from "../schemas/defaults.js";

const validBlogFrontmatter = {
  title: "My Post",
  slug: "my-post",
  summary: "A short summary.",
};

const validBody = "# My Post\n\nSome content here.";
const bodyNoHeading = "Just some text without a heading.";

describe("ValidationService", () => {
  const svc = new ValidationService();

  describe("blog schema — valid input", () => {
    it("returns valid for correct frontmatter and body", () => {
      const result = svc.validate(validBlogFrontmatter, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts single-word slug", () => {
      const fm = { ...validBlogFrontmatter, slug: "post" };
      expect(svc.validate(fm, validBody, BLOG_SCHEMA).valid).toBe(true);
    });

    it("accepts numeric slug segments", () => {
      const fm = { ...validBlogFrontmatter, slug: "api-guide-2024" };
      expect(svc.validate(fm, validBody, BLOG_SCHEMA).valid).toBe(true);
    });
  });

  describe("blog schema — frontmatter errors", () => {
    it("reports missing slug", () => {
      const { slug: _, ...fm } = validBlogFrontmatter;
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "slug")).toBe(true);
    });

    it("reports missing summary", () => {
      const { summary: _, ...fm } = validBlogFrontmatter;
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "summary")).toBe(true);
    });

    it("reports empty title", () => {
      const fm = { ...validBlogFrontmatter, title: "" };
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "title")).toBe(true);
    });

    it("reports empty summary", () => {
      const fm = { ...validBlogFrontmatter, summary: "" };
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "summary")).toBe(true);
    });

    it("rejects uppercase in slug", () => {
      const fm = { ...validBlogFrontmatter, slug: "My-Post" };
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "slug")).toBe(true);
    });

    it("rejects underscores in slug", () => {
      const fm = { ...validBlogFrontmatter, slug: "my_post" };
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "slug")).toBe(true);
    });

    it("rejects slug with spaces", () => {
      const fm = { ...validBlogFrontmatter, slug: "my post" };
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
    });

    it("rejects slug with leading hyphen", () => {
      const fm = { ...validBlogFrontmatter, slug: "-my-post" };
      const result = svc.validate(fm, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
    });

    it("reports multiple errors at once", () => {
      const result = svc.validate({}, validBody, BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("blog schema — body errors", () => {
    it("reports empty body", () => {
      const result = svc.validate(validBlogFrontmatter, "", BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "body")).toBe(true);
    });

    it("reports whitespace-only body", () => {
      const result = svc.validate(validBlogFrontmatter, "   \n  ", BLOG_SCHEMA);
      expect(result.valid).toBe(false);
      expect(result.errors.find((e) => e.path === "body")?.code).toBe(
        "REQUIRED",
      );
    });

    it("accepts body without heading", () => {
      const result = svc.validate(
        validBlogFrontmatter,
        bodyNoHeading,
        BLOG_SCHEMA,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("validateSchemaDocument()", () => {
    it("returns valid for a well-formed JSON Schema", () => {
      const schema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["title"],
        properties: { title: { type: "string" } },
      };
      const result = svc.validateSchemaDocument(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns valid for a minimal schema (empty object is valid)", () => {
      const result = svc.validateSchemaDocument({});
      expect(result.valid).toBe(true);
    });

    it("returns invalid when type is wrong (e.g. type: 42)", () => {
      const result = svc.validateSchemaDocument({ type: 42 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns invalid for non-object input", () => {
      const result = svc.validateSchemaDocument("not a schema");
      expect(result.valid).toBe(false);
    });
  });

  describe("custom schema", () => {
    const customSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Newsletter",
      type: "object",
      required: ["title", "summary"],
      properties: {
        title: { type: "string", minLength: 1 },
        summary: { type: "string", minLength: 1, maxLength: 500 },
      },
      "x-publishable": {
        body: { required: true },
      },
    };

    it("validates against a custom schema", () => {
      const fm = { title: "My Newsletter", summary: "A brief update." };
      const result = svc.validate(fm, bodyNoHeading, customSchema);
      expect(result.valid).toBe(true);
    });

    it("reports missing required fields per custom schema", () => {
      const result = svc.validate({}, bodyNoHeading, customSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "title")).toBe(true);
    });

    it("enforces custom maxLength", () => {
      const fm = { title: "My Newsletter", summary: "a".repeat(501) };
      const result = svc.validate(fm, bodyNoHeading, customSchema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "summary")).toBe(true);
    });
  });
});
