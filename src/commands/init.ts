import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";
import { writeConfig, CONFIG_PATH } from "../utils/config.js";

export async function initCommand(opts: {
  vault?: string;
  json?: boolean;
}): Promise<void> {
  const service = new PublishableService(opts.vault);
  const useJson = opts.json ?? false;
  try {
    const result = await service.init();
    if (opts.vault) {
      await writeConfig(CONFIG_PATH, { vault: opts.vault });
    }
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
