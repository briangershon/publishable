import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import type {
  PublishableSchema,
  ValidationError,
  ValidationResult,
} from "../types.js";

const ajv = new Ajv({ allErrors: true });
ajv.addKeyword({ keyword: "x-publishable" });

export class ValidationService {
  validate(
    frontmatter: unknown,
    body: string,
    schema: PublishableSchema,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    const validateFn = ajv.compile(schema);
    const valid = validateFn(frontmatter);

    if (!valid && validateFn.errors) {
      for (const err of validateFn.errors) {
        if (err.keyword === "required") {
          errors.push({
            path: String(err.params.missingProperty),
            code: "REQUIRED",
            message:
              err.message ??
              `${String(err.params.missingProperty)} is required`,
          });
        } else {
          const rawPath = err.instancePath.replace(/^\//, "");
          errors.push({
            path: rawPath || "frontmatter",
            code: err.keyword.toUpperCase(),
            message: err.message ?? `${rawPath || "frontmatter"} is invalid`,
          });
        }
      }
    }

    const bodyRules = schema["x-publishable"]?.body;
    const bodyRequired = bodyRules?.required !== false;
    const requireHeading = bodyRules?.requireHeading === true;

    const trimmedBody = body.trim();
    if (bodyRequired && trimmedBody.length === 0) {
      errors.push({
        path: "body",
        code: "REQUIRED",
        message: "Body must not be empty",
      });
    } else if (
      requireHeading &&
      trimmedBody.length > 0 &&
      !/^#{1,6}\s/m.test(trimmedBody)
    ) {
      errors.push({
        path: "body",
        code: "INVALID_FORMAT",
        message: "Body must contain at least one markdown heading",
      });
    }

    return { valid: errors.length === 0, errors };
  }
}
