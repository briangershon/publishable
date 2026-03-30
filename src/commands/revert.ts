import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function revertCommand(
  handle: string,
  versionStr: string,
  opts: { message?: string; json?: boolean },
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
    const result = await service.revert(handle, version, {
      message: opts.message,
    });
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
