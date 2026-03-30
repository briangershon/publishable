import { z } from "zod";
import type { ValidationError, ValidationResult } from "../types.js";

const v1FrontmatterSchema = z.object({
  title: z.string().min(1, "title must not be empty"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "slug must be slug-safe (lowercase, alphanumeric, hyphens only)",
    ),
  summary: z.string().min(1, "summary must not be empty"),
  tags: z
    .array(z.string().min(1, "each tag must not be empty"))
    .min(1, "tags must contain at least one entry"),
});

export class ValidationService {
  validate(frontmatter: unknown, body: string): ValidationResult {
    const errors: ValidationError[] = [];

    const result = v1FrontmatterSchema.safeParse(frontmatter);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          path: issue.path.length > 0 ? issue.path.join(".") : issue.path[0]?.toString() ?? "frontmatter",
          code: issue.code.toUpperCase(),
          message: issue.message,
        });
      }
    }

    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      errors.push({
        path: "body",
        code: "REQUIRED",
        message: "Body must not be empty",
      });
    } else if (!/^#{1,6}\s/m.test(trimmedBody)) {
      errors.push({
        path: "body",
        code: "INVALID_FORMAT",
        message: "Body must contain at least one markdown heading",
      });
    }

    return { valid: errors.length === 0, errors };
  }
}
