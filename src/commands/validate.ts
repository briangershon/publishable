import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function validateCommand(
  handle: string,
  opts: {
    schema?: string;
    noSchema?: boolean;
    json?: boolean;
  },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    if (!opts.schema && !opts.noSchema) {
      throw new PublishableError(
        "SCHEMA_REQUIRED",
        "Schema required. Use --schema <name> (e.g. --schema blog) or --no-schema to skip validation.",
      );
    }
    const version = await service.current(handle);
    const result = await service.validateVersion(
      version,
      opts.noSchema ? undefined : opts.schema,
    );
    // validate exits 0 even on invalid content (dry-run semantics)
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
