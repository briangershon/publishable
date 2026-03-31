import { homedir } from "os";
import { join } from "path";
import { readConfigSync, CONFIG_PATH } from "../utils/config.js";
import matter from "gray-matter";
import { NodeFileSystem } from "../filesystem/NodeFileSystem.js";
import type { IFileSystem } from "../filesystem/IFileSystem.js";
import { ValidationService } from "./ValidationService.js";
import { PublishableError } from "../utils/errors.js";
import { DEFAULT_SCHEMAS } from "../schemas/defaults.js";
import type {
  Handle,
  PublishableMeta,
  PublishableSchema,
  PublishableSummary,
  PublishableVersion,
  ValidationResult,
  VersionFrontmatter,
} from "../types.js";

const HANDLE_REGEX = /^[a-z][a-z0-9-]*$/;

export class PublishableService {
  private readonly vaultRoot: string;
  private readonly fs: IFileSystem;
  private readonly validator: ValidationService;

  constructor(vaultRoot?: string, fileSystem?: IFileSystem) {
    const config = readConfigSync(CONFIG_PATH);
    this.vaultRoot =
      vaultRoot ?? config.vault ?? join(homedir(), ".publishable", "vault");
    this.fs = fileSystem ?? new NodeFileSystem();
    this.validator = new ValidationService();
  }

  // --- Path helpers ---

  private publishablesDir(): string {
    return join(this.vaultRoot, "publishables");
  }

  private schemasDir(): string {
    return join(this.vaultRoot, "schemas");
  }

  private schemaPath(name: string): string {
    return join(this.schemasDir(), `${name}.json`);
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

  // --- Storage ---

  private async vaultExists(): Promise<boolean> {
    try {
      await this.fs.access(this.vaultRoot);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureVaultDir(): Promise<void> {
    await this.fs.mkdir(this.vaultRoot, { recursive: true });
  }

  private async readMeta(handle: Handle): Promise<PublishableMeta> {
    const path = this.metaPath(handle);
    let content: string;
    try {
      content = await this.fs.readFile(path, "utf-8");
    } catch {
      throw new PublishableError(
        "PUBLISHABLE_NOT_FOUND",
        `Publishable '${handle}' not found`,
      );
    }
    const parsed = matter(content);
    return parsed.data as PublishableMeta;
  }

  private async writeMeta(meta: PublishableMeta): Promise<void> {
    const dir = this.publishableDir(meta.handle);
    try {
      await this.fs.mkdir(dir, { recursive: true });
      const content = matter.stringify("", meta);
      await this.fs.writeFile(this.metaPath(meta.handle), content, "utf-8");
    } catch (err) {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Failed to write metadata for '${meta.handle}': ${String(err)}`,
      );
    }
  }

  private async readVersion(
    handle: Handle,
    version: number,
  ): Promise<PublishableVersion> {
    const path = this.versionPath(handle, version);
    let content: string;
    try {
      content = await this.fs.readFile(path, "utf-8");
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

  private async writeVersion(
    handle: Handle,
    version: PublishableVersion,
  ): Promise<void> {
    const path = this.versionPath(handle, version.frontmatter.version);
    try {
      const content = matter.stringify(version.body, version.frontmatter);
      await this.fs.writeFile(path, content, "utf-8");
    } catch (err) {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Failed to write version ${version.frontmatter.version} of '${handle}': ${String(err)}`,
      );
    }
  }

  private async listVersionNumbers(handle: Handle): Promise<number[]> {
    const dir = this.publishableDir(handle);
    let entries: string[];
    try {
      entries = await this.fs.readdir(dir);
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

  private async listHandles(): Promise<Handle[]> {
    const dir = this.publishablesDir();
    let entries: string[];
    try {
      entries = await this.fs.readdir(dir);
    } catch {
      return [];
    }
    const handles: Handle[] = [];
    for (const entry of entries) {
      try {
        const stat = await this.fs.stat(join(dir, entry));
        if (stat.isDirectory()) handles.push(entry);
      } catch {
        // skip unreadable entries
      }
    }
    return handles.toSorted();
  }

  private async readSchemaFile(name: string): Promise<PublishableSchema> {
    const path = this.schemaPath(name);
    let content: string;
    try {
      content = await this.fs.readFile(path, "utf-8");
    } catch {
      throw new PublishableError(
        "SCHEMA_NOT_FOUND",
        `Schema '${name}' not found. Run 'publishable init' to create default schemas, or add ${name}.json to ${this.schemasDir()}`,
      );
    }
    try {
      return JSON.parse(content) as PublishableSchema;
    } catch {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Schema '${name}' contains invalid JSON`,
      );
    }
  }

  private async writeSchemaFile(name: string, schema: object): Promise<void> {
    const dir = this.schemasDir();
    try {
      await this.fs.mkdir(dir, { recursive: true });
      await this.fs.writeFile(
        this.schemaPath(name),
        JSON.stringify(schema, null, 2),
        "utf-8",
      );
    } catch (err) {
      throw new PublishableError(
        "STORAGE_ERROR",
        `Failed to write schema '${name}': ${String(err)}`,
      );
    }
  }

  // --- Business logic ---

  private async assertVaultInitialized(): Promise<void> {
    if (!(await this.vaultExists())) {
      throw new PublishableError(
        "VAULT_NOT_INITIALIZED",
        "No vault found. Run 'publishable init' to set up your vault.",
      );
    }
  }

  private assertValidHandle(handle: string): void {
    if (!HANDLE_REGEX.test(handle)) {
      throw new PublishableError(
        "INVALID_HANDLE",
        `Invalid handle '${handle}'. Handles must match ^[a-z][a-z0-9-]*$`,
      );
    }
  }

  async update(
    handle: string,
    fileContent: string,
    opts: { title?: string; message?: string; schema?: string },
  ): Promise<PublishableSummary> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);

    const resolvedSchema = opts.schema ?? "blog";
    const schemaJson = await this.readSchemaFile(resolvedSchema);

    const parsed = matter(fileContent);
    const fileFrontmatter = parsed.data as Record<string, unknown>;
    const body = parsed.content.trimStart();

    // Title resolution: --title flag overrides file frontmatter
    const resolvedTitle =
      opts.title ?? (fileFrontmatter["title"] as string | undefined);

    // Build frontmatter for validation (exclude version-specific fields)
    const frontmatterToValidate = { ...fileFrontmatter };
    if (resolvedTitle) frontmatterToValidate["title"] = resolvedTitle;

    const validation = this.validator.validate(
      frontmatterToValidate,
      body,
      schemaJson,
    );
    if (!validation.valid) {
      throw new PublishableError(
        "SCHEMA_VALIDATION_FAILED",
        "Publishable content failed validation",
        validation.errors,
      );
    }

    const now = new Date().toISOString();

    let existingMeta: PublishableMeta | undefined;
    try {
      existingMeta = await this.readMeta(handle);
    } catch (e) {
      if (
        !(e instanceof PublishableError) ||
        e.code !== "PUBLISHABLE_NOT_FOUND"
      )
        throw e;
    }
    const isNew = existingMeta === undefined;

    if (isNew && !resolvedTitle) {
      throw new PublishableError(
        "TITLE_REQUIRED_ON_CREATE",
        "A --title is required when creating a new publishable (or include title in file frontmatter)",
      );
    }

    let newVersionNumber: number;
    let meta: PublishableMeta;

    if (isNew) {
      newVersionNumber = 1;
      meta = {
        handle,
        title: resolvedTitle!,
        current_version: 1,
        created_at: now,
        updated_at: now,
      };
    } else {
      meta = existingMeta!;
      newVersionNumber = meta.current_version + 1;
      meta = {
        ...meta,
        current_version: newVersionNumber,
        updated_at: now,
      };
      if (opts.title) meta.title = opts.title;
    }

    const versionFrontmatter: VersionFrontmatter = {
      version: newVersionNumber,
      schema: `${resolvedSchema}/v1`,
      message: opts.message ?? "",
      created_at: now,
      title: resolvedTitle ?? meta.title,
      ...(frontmatterToValidate["slug"] !== undefined && {
        slug: frontmatterToValidate["slug"] as string,
      }),
      summary: frontmatterToValidate["summary"] as string,
      ...(frontmatterToValidate["tags"] !== undefined && {
        tags: frontmatterToValidate["tags"] as string[],
      }),
    };

    const version: PublishableVersion = {
      frontmatter: versionFrontmatter,
      body,
    };

    await this.writeMeta(meta);
    await this.writeVersion(handle, version);

    return {
      handle: meta.handle,
      title: meta.title,
      current_version: meta.current_version,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
    };
  }

  async current(handle: string): Promise<PublishableVersion> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.readMeta(handle);
    return this.readVersion(handle, meta.current_version);
  }

  async validate(
    fileContent: string,
    schema?: string,
  ): Promise<ValidationResult> {
    await this.assertVaultInitialized();
    const resolvedSchema = schema ?? "blog";
    const schemaJson = await this.readSchemaFile(resolvedSchema);
    const parsed = matter(fileContent);
    const body = parsed.content.trimStart();
    return this.validator.validate(parsed.data, body, schemaJson);
  }

  async init(): Promise<{ schemas: string[]; created: string[] }> {
    await this.ensureVaultDir();
    const created: string[] = [];
    for (const [name, schemaObj] of Object.entries(DEFAULT_SCHEMAS)) {
      try {
        await this.readSchemaFile(name);
      } catch (e) {
        if (e instanceof PublishableError && e.code === "SCHEMA_NOT_FOUND") {
          await this.writeSchemaFile(name, schemaObj);
          created.push(name);
        } else {
          throw e;
        }
      }
    }
    return { schemas: Object.keys(DEFAULT_SCHEMAS), created };
  }

  async versions(
    handle: string,
  ): Promise<{ handle: Handle; versions: number[]; current_version: number }> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.readMeta(handle);
    const versions = await this.listVersionNumbers(handle);
    return { handle, versions, current_version: meta.current_version };
  }

  async show(handle: string, version: number): Promise<PublishableVersion> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    await this.readMeta(handle); // ensure publishable exists
    return this.readVersion(handle, version);
  }

  async revert(
    handle: string,
    targetVersion: number,
    opts: { message?: string },
  ): Promise<PublishableSummary> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.readMeta(handle);
    const oldVersion = await this.readVersion(handle, targetVersion);

    const now = new Date().toISOString();
    const newVersionNumber = meta.current_version + 1;

    const newVersionFrontmatter: VersionFrontmatter = {
      ...oldVersion.frontmatter,
      version: newVersionNumber,
      created_at: now,
      message: opts.message ?? `Revert to v${targetVersion}`,
      reverted_from: targetVersion,
    };

    const newVersion: PublishableVersion = {
      frontmatter: newVersionFrontmatter,
      body: oldVersion.body,
    };

    const updatedMeta: PublishableMeta = {
      ...meta,
      current_version: newVersionNumber,
      updated_at: now,
    };

    await this.writeVersion(handle, newVersion);
    await this.writeMeta(updatedMeta);

    return {
      handle: updatedMeta.handle,
      title: updatedMeta.title,
      current_version: updatedMeta.current_version,
      created_at: updatedMeta.created_at,
      updated_at: updatedMeta.updated_at,
    };
  }

  async list(): Promise<PublishableSummary[]> {
    await this.assertVaultInitialized();
    const handles = await this.listHandles();
    const summaries: PublishableSummary[] = [];
    for (const handle of handles) {
      const meta = await this.readMeta(handle);
      summaries.push({
        handle: meta.handle,
        title: meta.title,
        current_version: meta.current_version,
        created_at: meta.created_at,
        updated_at: meta.updated_at,
      });
    }
    return summaries;
  }

  async get(handle: string): Promise<PublishableSummary> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.readMeta(handle);
    return {
      handle: meta.handle,
      title: meta.title,
      current_version: meta.current_version,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
    };
  }

  async serializeVersion(version: PublishableVersion): Promise<string> {
    return matter.stringify(version.body, version.frontmatter);
  }
}
