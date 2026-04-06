import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function currentCommand(
  handle: string,
  opts: { output?: string; json?: boolean },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    const version = await service.current(handle);
    if (opts.output) {
      const content = await service.serializeVersion(version);
      await import("fs/promises").then((fs) =>
        fs.writeFile(opts.output!, content, "utf-8"),
      );
      outputSuccess({ written_to: opts.output }, useJson);
    } else {
      outputSuccess(version, useJson);
    }
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
