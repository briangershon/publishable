import { promises as fs } from "fs";
import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function updateCommand(
  handle: string,
  opts: {
    file: string;
    title?: string;
    message?: string;
    json?: boolean;
  },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    let fileContent: string;
    try {
      fileContent = await fs.readFile(opts.file, "utf-8");
    } catch {
      throw new PublishableError(
        "FILE_NOT_FOUND",
        `File not found: ${opts.file}`,
      );
    }
    const result = await service.update(handle, fileContent, {
      title: opts.title,
      message: opts.message,
    });
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
