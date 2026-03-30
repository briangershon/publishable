import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function initCommand(opts: { json?: boolean }): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    const result = await service.init();
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
