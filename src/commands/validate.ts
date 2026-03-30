import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function validateCommand(opts: {
  file: string;
  schema?: string;
  json?: boolean;
}): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    const result = await service.validate(opts.file, opts.schema);
    // validate exits 0 even on invalid content (dry-run semantics)
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
