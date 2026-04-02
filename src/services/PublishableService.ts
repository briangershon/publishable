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
  ErrorCode,
  ExportFormat,
  Handle,
  PublishableMeta,
  PublishableSchema,
  PublishableSummary,
  PublishableVersion,
  SchemaCreateResult,
  SchemaCustomizeResult,
  SchemaListResult,
  SchemaShowResult,
  SchemaUpdateResult,
  ValidationResult,
  VersionFrontmatter,
} from "../types.js";

const HANDLE_REGEX = /^[a-z][a-z0-9-]*$/;

const SYSTEM_FIELDS = new Set([
  "version",
  "schema",
  "message",
  "created_at",
  "reverted_from",
]);

function extractContentFields(
  frontmatter: VersionFrontmatter,
): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!SYSTEM_FIELDS.has(key) && value !== undefined) content[key] = value;
  }
  return content;
}

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
    const content = await this.readFileOrThrow(
      this.metaPath(handle),
      "PUBLISHABLE_NOT_FOUND",
      `Publishable '${handle}' not found`,
    );
    return matter(content).data as PublishableMeta;
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
    const content = await this.readFileOrThrow(
      this.versionPath(handle, version),
      "VERSION_NOT_FOUND",
      `Version ${version} of '${handle}' not found`,
    );
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
    let content: string;
    try {
      content = await this.readFileOrThrow(
        this.schemaPath(name),
        "SCHEMA_NOT_FOUND",
        `Schema '${name}' not found. Add ${name}.json to ${this.schemasDir()}, or run 'publishable schema customize ${name}' if it is a built-in.`,
      );
    } catch (e) {
      if (
        e instanceof PublishableError &&
        e.code === "SCHEMA_NOT_FOUND" &&
        name in DEFAULT_SCHEMAS
      ) {
        return DEFAULT_SCHEMAS[name] as PublishableSchema;
      }
      throw e;
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

  // --- Helpers ---

  private metaToSummary(meta: PublishableMeta): PublishableSummary {
    return {
      handle: meta.handle,
      current_version: meta.current_version,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
    };
  }

  private async readFileOrThrow(
    path: string,
    code: ErrorCode,
    message: string,
  ): Promise<string> {
    try {
      return await this.fs.readFile(path, "utf-8");
    } catch {
      throw new PublishableError(code, message);
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
    opts: { message?: string },
  ): Promise<PublishableSummary> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);

    const parsed = matter(fileContent);
    const fileFrontmatter = parsed.data as Record<string, unknown>;
    const body = parsed.content.trimStart();

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

    let newVersionNumber: number;
    let meta: PublishableMeta;

    if (isNew) {
      newVersionNumber = 1;
      meta = {
        handle,
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
    }

    const versionFrontmatter: VersionFrontmatter = {
      version: newVersionNumber,
      message: opts.message ?? "",
      created_at: now,
    };
    for (const [key, value] of Object.entries(fileFrontmatter)) {
      if (!SYSTEM_FIELDS.has(key) && value !== undefined) {
        versionFrontmatter[key] = value;
      }
    }

    const version: PublishableVersion = {
      frontmatter: versionFrontmatter,
      body,
    };

    await this.writeMeta(meta);
    await this.writeVersion(handle, version);

    return this.metaToSummary(meta);
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
    if (!schema) return { valid: true, errors: [] };
    const schemaJson = await this.readSchemaFile(schema);
    const parsed = matter(fileContent);
    const body = parsed.content.trimStart();
    const result = this.validator.validate(parsed.data, body, schemaJson);
    return { ...result, schema };
  }

  async validateVersion(
    version: PublishableVersion,
    schema?: string,
  ): Promise<ValidationResult> {
    await this.assertVaultInitialized();
    if (!schema) return { valid: true, errors: [] };
    const schemaJson = await this.readSchemaFile(schema);
    const contentFields = extractContentFields(version.frontmatter);
    const result = this.validator.validate(
      contentFields,
      version.body,
      schemaJson,
    );
    return { ...result, schema };
  }

  async init(): Promise<{ schemas: string[] }> {
    await this.ensureVaultDir();
    return { schemas: Object.keys(DEFAULT_SCHEMAS) };
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

    return this.metaToSummary(updatedMeta);
  }

  async list(): Promise<PublishableSummary[]> {
    await this.assertVaultInitialized();
    const handles = await this.listHandles();
    const summaries: PublishableSummary[] = [];
    for (const handle of handles) {
      const meta = await this.readMeta(handle);
      summaries.push(this.metaToSummary(meta));
    }
    return summaries;
  }

  async get(handle: string): Promise<PublishableSummary> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.readMeta(handle);
    return this.metaToSummary(meta);
  }

  async schemaList(): Promise<SchemaListResult> {
    await this.assertVaultInitialized();
    const onDisk = new Set<string>();
    try {
      const entries = await this.fs.readdir(this.schemasDir());
      for (const f of entries) {
        if (f.endsWith(".json")) onDisk.add(f.slice(0, -5));
      }
    } catch {
      // schemas dir may not exist yet
    }
    const all = new Map<string, "default" | "custom">();
    for (const name of Object.keys(DEFAULT_SCHEMAS)) {
      all.set(name, onDisk.has(name) ? "custom" : "default");
    }
    for (const name of onDisk) {
      if (!all.has(name)) all.set(name, "custom");
    }
    const schemas = [...all.entries()]
      .map(([name, source]) => ({ name, source }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { schemas };
  }

  async schemaCreate(
    name: string,
    fileContent: string,
  ): Promise<SchemaCreateResult> {
    await this.assertVaultInitialized();
    try {
      await this.readSchemaFile(name);
      throw new PublishableError(
        "SCHEMA_ALREADY_EXISTS",
        `Schema '${name}' already exists. Use 'publishable schema update' to replace it.`,
      );
    } catch (e) {
      if (!(e instanceof PublishableError) || e.code !== "SCHEMA_NOT_FOUND") {
        throw e;
      }
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new PublishableError(
        "STORAGE_ERROR",
        `File does not contain valid JSON`,
      );
    }
    const metaResult = this.validator.validateSchemaDocument(parsed);
    if (!metaResult.valid) {
      throw new PublishableError(
        "INVALID_SCHEMA",
        "File is not a valid JSON Schema",
        metaResult.errors,
      );
    }
    await this.writeSchemaFile(name, parsed as object);
    return { name, created: true };
  }

  async schemaUpdate(
    name: string,
    fileContent: string,
  ): Promise<SchemaUpdateResult> {
    await this.assertVaultInitialized();
    await this.readSchemaFile(name);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      throw new PublishableError(
        "STORAGE_ERROR",
        `File does not contain valid JSON`,
      );
    }
    const metaResult = this.validator.validateSchemaDocument(parsed);
    if (!metaResult.valid) {
      throw new PublishableError(
        "INVALID_SCHEMA",
        "File is not a valid JSON Schema",
        metaResult.errors,
      );
    }
    await this.writeSchemaFile(name, parsed as object);
    return { name, updated: true };
  }

  async schemaShow(name: string): Promise<SchemaShowResult> {
    await this.assertVaultInitialized();
    const schema = await this.readSchemaFile(name);
    return { name, schema };
  }

  async schemaCustomize(
    name: string,
    force = false,
  ): Promise<SchemaCustomizeResult> {
    await this.assertVaultInitialized();
    if (!(name in DEFAULT_SCHEMAS)) {
      throw new PublishableError(
        "SCHEMA_NOT_FOUND",
        `'${name}' is not a built-in schema. Built-in schemas: ${Object.keys(DEFAULT_SCHEMAS).join(", ")}`,
      );
    }
    if (!force) {
      try {
        await this.readFileOrThrow(
          this.schemaPath(name),
          "SCHEMA_NOT_FOUND",
          "",
        );
        throw new PublishableError(
          "SCHEMA_ALREADY_EXISTS",
          `Schema '${name}' is already customized. Use --force to overwrite.`,
        );
      } catch (e) {
        if (!(e instanceof PublishableError) || e.code !== "SCHEMA_NOT_FOUND") {
          throw e;
        }
        // SCHEMA_NOT_FOUND means no custom file yet — proceed
      }
    }
    await this.writeSchemaFile(name, DEFAULT_SCHEMAS[name]);
    return { name, path: this.schemaPath(name) };
  }

  async serializeVersion(version: PublishableVersion): Promise<string> {
    return this.serializeVersionAs(version, "raw");
  }

  serializeVersionAs(
    version: PublishableVersion,
    format: ExportFormat | "raw",
  ): string {
    if (format === "raw") {
      return matter.stringify(version.body, version.frontmatter);
    }

    const contentFrontmatter = extractContentFields(version.frontmatter);

    if (format === "md") {
      return matter.stringify(version.body, contentFrontmatter);
    }
    if (format === "body") {
      return version.body;
    }
    // format === "json"
    return JSON.stringify(
      { ...contentFrontmatter, body: version.body },
      null,
      2,
    );
  }

  async export(
    handle: string,
    opts: { schema?: string; format: ExportFormat },
  ): Promise<string> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const version = await this.current(handle);

    if (opts.schema) {
      const schemaJson = await this.readSchemaFile(opts.schema);
      const contentForValidation = extractContentFields(version.frontmatter);
      const validation = this.validator.validate(
        contentForValidation,
        version.body,
        schemaJson,
      );
      if (!validation.valid) {
        throw new PublishableError(
          "SCHEMA_VALIDATION_FAILED",
          "Publishable content failed validation",
          validation.errors,
        );
      }
    }

    return this.serializeVersionAs(version, opts.format);
  }
}
