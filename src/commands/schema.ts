import { promises as fs } from "fs";
import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";

export async function schemaShowCommand(
  name: string,
  opts: { json?: boolean },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    const result = await service.schemaShow(name);
    if (useJson) {
      outputSuccess(result.schema, useJson);
    } else {
      outputSuccess(result, useJson);
    }
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}

export async function schemaListCommand(opts: {
  json?: boolean;
}): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    const result = await service.schemaList();
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}

export async function schemaCreateCommand(
  name: string,
  opts: { file: string; json?: boolean },
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
    const result = await service.schemaCreate(name, fileContent);
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}

export async function schemaCustomizeCommand(
  name: string,
  opts: { force?: boolean; json?: boolean },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  try {
    const result = await service.schemaCustomize(name, opts.force ?? false);
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}

export async function schemaUpdateCommand(
  name: string,
  opts: { file: string; json?: boolean },
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
    const result = await service.schemaUpdate(name, fileContent);
    outputSuccess(result, useJson);
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
