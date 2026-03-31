import { readFileSync } from "fs";
import { promises as fs } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { PublishableError } from "./errors.js";

interface PublishableConfig {
  vault?: string;
}

export const CONFIG_PATH = join(homedir(), ".publishable", "config.json");

export function readConfigSync(configPath: string): PublishableConfig {
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as PublishableConfig;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new PublishableError(
      "STORAGE_ERROR",
      `Config file at ${configPath} contains invalid JSON`,
    );
  }
}

export async function writeConfig(
  configPath: string,
  config: PublishableConfig,
): Promise<void> {
  try {
    await fs.mkdir(dirname(configPath), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2) + "\n",
      "utf-8",
    );
  } catch {
    throw new PublishableError(
      "STORAGE_ERROR",
      `Failed to write config file at ${configPath}`,
    );
  }
}
