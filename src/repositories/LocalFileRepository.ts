import { promises as fs } from "fs";
import { join } from "path";
import matter from "gray-matter";
import type {
  Handle,
  PublishableMeta,
  PublishableVersion,
  VersionFrontmatter,
} from "../types.js";
import { PublishableError } from "../utils/errors.js";

export class LocalFileRepository {
  private readonly vaultRoot: string;

  constructor(vaultRoot: string) {
    this.vaultRoot = vaultRoot;
  }

  private publishablesDir(): string {
    return join(this.vaultRoot, "publishables");
  }

  private publishableDir(handle: Handle): string {
    return join(this.publishablesDir(), handle);
  }

  private metaPath(handle: Handle): string {
    return join(this.publishableDir(handle), "publishable.md");
  }

  private versionPath(handle: Handle, version: number): string {
    return join(this.publishableDir(handle), `v${version}.md`);
  }

  async exists(handle: Handle): Promise<boolean> {
    try {
      await fs.access(this.publishableDir(handle));
      return true;
    } catch {
      return false;
    }
  }

  async readMeta(handle: Handle): Promise<PublishableMeta> {
    const path = this.metaPath(handle);
    let content: string;
    try {
      content = await fs.readFile(path, "utf-8");
    } catch {
      throw new PublishableError(
        "PUBLISHABLE_NOT_FOUND",
        `Publishable '${handle}' not found`,
      );
    }
    const parsed = matter(content);
    return parsed.data as PublishableMeta;
  }

  async writeMeta(meta: PublishableMeta): Promise<void> {
    const dir = this.publishableDir(meta.handle);
    try {
      await fs.mkdir(dir, { recursive: true });
      const content = matter.stringify("", meta);
      await fs.writeFile(this.metaPath(meta.handle), content, "utf-8");
    } catch (err) {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Failed to write metadata for '${meta.handle}': ${String(err)}`,
      );
    }
  }

  async readVersion(handle: Handle, version: number): Promise<PublishableVersion> {
    const path = this.versionPath(handle, version);
    let content: string;
    try {
      content = await fs.readFile(path, "utf-8");
    } catch {
      throw new PublishableError(
        "VERSION_NOT_FOUND",
        `Version ${version} of '${handle}' not found`,
      );
    }
    const parsed = matter(content);
    return {
      frontmatter: parsed.data as VersionFrontmatter,
      body: parsed.content.trimStart(),
    };
  }

  async writeVersion(handle: Handle, version: PublishableVersion): Promise<void> {
    const path = this.versionPath(handle, version.frontmatter.version);
    try {
      const content = matter.stringify(version.body, version.frontmatter);
      await fs.writeFile(path, content, "utf-8");
    } catch (err) {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Failed to write version ${version.frontmatter.version} of '${handle}': ${String(err)}`,
      );
    }
  }

  async listVersionNumbers(handle: Handle): Promise<number[]> {
    const dir = this.publishableDir(handle);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      throw new PublishableError(
        "PUBLISHABLE_NOT_FOUND",
        `Publishable '${handle}' not found`,
      );
    }
    const numbers = entries
      .map((f) => f.match(/^v(\d+)\.md$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => parseInt(m[1], 10));
    return numbers.toSorted((a, b) => a - b);
  }

  async listHandles(): Promise<Handle[]> {
    const dir = this.publishablesDir();
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return [];
    }
    const handles: Handle[] = [];
    for (const entry of entries) {
      try {
        const stat = await fs.stat(join(dir, entry));
        if (stat.isDirectory()) handles.push(entry);
      } catch {
        // skip unreadable entries
      }
    }
    return handles.toSorted();
  }

  async readFileContent(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      throw new PublishableError(
        "FILE_NOT_FOUND",
        `File not found: ${filePath}`,
      );
    }
  }

  async writeFileContent(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, "utf-8");
    } catch (err) {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Failed to write file '${filePath}': ${String(err)}`,
      );
    }
  }
}
