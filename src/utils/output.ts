import { PublishableError } from "./errors.js";

export function outputSuccess<T>(data: T, useJson: boolean): void {
  if (useJson) {
    console.log(JSON.stringify({ ok: true, data }, null, 2));
  } else {
    printHuman(data);
  }
}

export function outputError(err: PublishableError, useJson: boolean): never {
  if (useJson) {
    const output: {
      ok: false;
      error: { code: string; message: string; details?: unknown };
    } = {
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) {
      output.error.details = err.details;
    }
    console.error(JSON.stringify(output, null, 2));
  } else {
    console.error(`Error [${err.code}]: ${err.message}`);
    if (err.details && err.details.length > 0) {
      for (const d of err.details) {
        console.error(`  - ${d.path}: ${d.message}`);
      }
    }
  }
  process.exit(1);
}

function printHuman(data: unknown): void {
  if (data === null || data === undefined) return;
  if (typeof data !== "object") {
    console.log(String(data));
    return;
  }
  const obj = data as Record<string, unknown>;

  // versions list result
  if ("versions" in obj && "current_version" in obj) {
    const o = obj as {
      handle: string;
      versions: number[];
      current_version: number;
    };
    console.log(`handle:          ${o.handle}`);
    console.log(`current_version: ${o.current_version}`);
    console.log(`versions:        ${o.versions.join(", ")}`);
    return;
  }

  // PublishableSummary or update/revert result
  if ("handle" in obj && "current_version" in obj) {
    console.log(`handle:          ${obj.handle}`);
    console.log(`current_version: ${obj.current_version}`);
    console.log(`created_at:      ${obj.created_at}`);
    console.log(`updated_at:      ${obj.updated_at}`);
    return;
  }

  // PublishableVersion (current / show)
  if ("frontmatter" in obj && "body" in obj) {
    const fm = obj.frontmatter as Record<string, unknown>;
    const versionSystemFields = new Set([
      "version",
      "schema",
      "message",
      "created_at",
      "reverted_from",
    ]);
    console.log(`version: ${fm.version}`);
    if (fm.schema) console.log(`schema:  ${fm.schema}`);
    if (fm.message) console.log(`message: ${fm.message}`);
    if (fm.reverted_from) console.log(`reverted_from: ${fm.reverted_from}`);
    for (const [key, value] of Object.entries(fm)) {
      if (!versionSystemFields.has(key)) {
        console.log(
          `${key}: ${Array.isArray(value) ? (value as unknown[]).join(", ") : String(value)}`,
        );
      }
    }
    console.log(`\n${obj.body}`);
    return;
  }

  // SchemaListResult
  if ("schemas" in obj && Array.isArray(obj.schemas)) {
    const names = obj.schemas as string[];
    if (names.length === 0) {
      console.log("No schemas found.");
      return;
    }
    for (const name of names) {
      console.log(name);
    }
    return;
  }

  // SchemaCreateResult
  if ("name" in obj && "created" in obj) {
    console.log(`Schema '${obj.name}' created.`);
    return;
  }

  // SchemaUpdateResult
  if ("name" in obj && "updated" in obj) {
    console.log(`Schema '${obj.name}' updated.`);
    return;
  }

  // SchemaShowResult
  if ("name" in obj && "schema" in obj && typeof obj.schema === "object") {
    const name = obj.name as string;
    const s = obj.schema as Record<string, unknown>;
    console.log(`name:     ${name}`);
    if (s.title) console.log(`title:    ${s.title}`);
    const required = s.required as string[] | undefined;
    if (Array.isArray(required) && required.length > 0) {
      console.log(`\nrequired: ${required.join(", ")}`);
    }
    const props = s.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (props && Object.keys(props).length > 0) {
      const hasDesc = Object.values(props).some((p) => p.description);
      console.log("\nproperties:");
      for (const [key, prop] of Object.entries(props)) {
        const type = String(prop.type ?? "");
        const desc = hasDesc ? `   ${String(prop.description ?? "")}` : "";
        console.log(`  ${key.padEnd(10)} ${type.padEnd(8)}${desc}`);
      }
    }
    const xpub = s["x-publishable"] as Record<string, unknown> | undefined;
    const body = xpub?.body as Record<string, unknown> | undefined;
    if (body) {
      console.log("\nbody:");
      if (body.required !== undefined)
        console.log(`  required:       ${body.required ? "yes" : "no"}`);
      if (body.requireHeading !== undefined)
        console.log(`  requireHeading: ${body.requireHeading ? "yes" : "no"}`);
    }
    return;
  }

  // list result (array)
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log("No publishables found.");
      return;
    }
    for (const item of data) {
      printHuman(item);
      console.log("---");
    }
    return;
  }

  // ValidationResult
  if ("valid" in obj) {
    const r = obj as { valid: boolean; schema: string; errors: unknown[] };
    const schemaLabel = r.schema ?? "unknown";
    if (r.valid) {
      console.log(`Valid: Content passed ${schemaLabel} schema validation.`);
    } else {
      console.log(`Invalid: Content failed ${schemaLabel} schema validation.`);
      if (Array.isArray(r.errors)) {
        for (const e of r.errors as Array<{
          path: string;
          code: string;
          message: string;
        }>) {
          console.log(`  - ${e.path}: ${e.message}`);
        }
      }
    }
    return;
  }

  // fallback
  console.log(JSON.stringify(data, null, 2));
}
