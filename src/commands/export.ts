import { PublishableService } from "../services/PublishableService.js";
import { PublishableError } from "../utils/errors.js";
import { outputSuccess, outputError } from "../utils/output.js";
import type { ExportFormat } from "../types.js";

export async function exportCommand(
  handle: string,
  opts: {
    format?: string;
    schema?: string;
    noSchema?: boolean;
    output?: string;
    json?: boolean;
  },
): Promise<void> {
  const service = new PublishableService();
  const useJson = opts.json ?? false;
  const format = (opts.format ?? "md") as ExportFormat;
  try {
    if (!opts.schema && !opts.noSchema) {
      throw new PublishableError(
        "SCHEMA_REQUIRED",
        "Schema required. Use --schema <name> (e.g. --schema blog) or --no-schema to skip validation.",
      );
    }
    const content = await service.export(handle, {
      schema: opts.noSchema ? undefined : opts.schema,
      format,
    });
    if (opts.output) {
      await import("fs/promises").then((fs) =>
        fs.writeFile(opts.output!, content, "utf-8"),
      );
      outputSuccess({ written_to: opts.output }, useJson);
    } else if (useJson) {
      outputSuccess({ content, format }, useJson);
    } else {
      process.stdout.write(content.endsWith("\n") ? content : content + "\n");
    }
  } catch (e) {
    if (e instanceof PublishableError) outputError(e, useJson);
    throw e;
  }
}
