import { describe, it, expect } from "vitest";
import { ValidationService } from "./ValidationService.js";

const validFrontmatter = {
  title: "My Post",
  slug: "my-post",
  summary: "A short summary.",
  tags: ["ai", "test"],
};

const validBody = "# My Post\n\nSome content here.";

describe("ValidationService", () => {
  const svc = new ValidationService();

  describe("valid input", () => {
    it("returns valid for correct frontmatter and body", () => {
      const result = svc.validate(validFrontmatter, validBody);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts heading levels 1-6", () => {
      for (let i = 1; i <= 6; i++) {
        const body = `${"#".repeat(i)} Heading\n\ncontent`;
        expect(svc.validate(validFrontmatter, body).valid).toBe(true);
      }
    });

    it("accepts single-word slug", () => {
      const fm = { ...validFrontmatter, slug: "post" };
      expect(svc.validate(fm, validBody).valid).toBe(true);
    });

    it("accepts numeric slug segments", () => {
      const fm = { ...validFrontmatter, slug: "api-guide-2024" };
      expect(svc.validate(fm, validBody).valid).toBe(true);
    });
  });

  describe("frontmatter errors", () => {
    it("reports missing slug", () => {
      const { slug: _, ...fm } = validFrontmatter;
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "slug")).toBe(true);
    });

    it("reports missing summary", () => {
      const { summary: _, ...fm } = validFrontmatter;
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "summary")).toBe(true);
    });

    it("reports missing tags", () => {
      const { tags: _, ...fm } = validFrontmatter;
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "tags")).toBe(true);
    });

    it("reports empty title", () => {
      const fm = { ...validFrontmatter, title: "" };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "title")).toBe(true);
    });

    it("reports empty summary", () => {
      const fm = { ...validFrontmatter, summary: "" };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "summary")).toBe(true);
    });

    it("reports empty tags array", () => {
      const fm = { ...validFrontmatter, tags: [] };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "tags")).toBe(true);
    });

    it("rejects uppercase in slug", () => {
      const fm = { ...validFrontmatter, slug: "My-Post" };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "slug")).toBe(true);
    });

    it("rejects underscores in slug", () => {
      const fm = { ...validFrontmatter, slug: "my_post" };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "slug")).toBe(true);
    });

    it("rejects slug with spaces", () => {
      const fm = { ...validFrontmatter, slug: "my post" };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
    });

    it("rejects slug with leading hyphen", () => {
      const fm = { ...validFrontmatter, slug: "-my-post" };
      const result = svc.validate(fm, validBody);
      expect(result.valid).toBe(false);
    });

    it("reports multiple errors at once", () => {
      const result = svc.validate({}, validBody);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("body errors", () => {
    it("reports empty body", () => {
      const result = svc.validate(validFrontmatter, "");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "body")).toBe(true);
    });

    it("reports whitespace-only body", () => {
      const result = svc.validate(validFrontmatter, "   \n  ");
      expect(result.valid).toBe(false);
      expect(result.errors.find((e) => e.path === "body")?.code).toBe(
        "REQUIRED",
      );
    });

    it("reports body without heading", () => {
      const result = svc.validate(
        validFrontmatter,
        "Just some text without a heading.",
      );
      expect(result.valid).toBe(false);
      expect(result.errors.find((e) => e.path === "body")?.code).toBe(
        "INVALID_FORMAT",
      );
    });

    it("does not flag heading check when body is empty", () => {
      const result = svc.validate(validFrontmatter, "");
      const bodyErrors = result.errors.filter((e) => e.path === "body");
      expect(bodyErrors).toHaveLength(1);
      expect(bodyErrors[0].code).toBe("REQUIRED");
    });
  });
});
