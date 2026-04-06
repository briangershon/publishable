import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function showCommand(
  handle: string,
  versionStr: string,
  opts: { output?: string; json?: boolean },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  const version = parseInt(versionStr, 10);
  if (isNaN(version)) {
    outputError(
      new PublishableError(
        "VERSION_NOT_FOUND",
        `Invalid version number: '${versionStr}'`,
      ),
      useJson,
    );
  }
  try {
    const result = await service.show(handle, version);
    if (opts.output) {
      const content = await service.serializeVersion(result);
      await import("fs/promises").then((fs) =>
        fs.writeFile(opts.output!, content, "utf-8"),
      );
      outputSuccess({ written_to: opts.output }, useJson);
    } else {
      outputSuccess(result, useJson);
    }
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
