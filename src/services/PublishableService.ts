import { homedir } from "os";
import { join } from "path";
import { readConfigSync, CONFIG_PATH } from "../utils/config.js";
import matter from "gray-matter";
import { LocalFileRepository } from "../repositories/LocalFileRepository.js";
import type { IPublishableRepository } from "../repositories/IPublishableRepository.js";
import { ValidationService } from "./ValidationService.js";
import { PublishableError } from "../utils/errors.js";
import { DEFAULT_SCHEMAS } from "../schemas/defaults.js";
import type {
  Handle,
  PublishableMeta,
  PublishableSummary,
  PublishableVersion,
  ValidationResult,
  VersionFrontmatter,
} from "../types.js";

const HANDLE_REGEX = /^[a-z][a-z0-9-]*$/;

export class PublishableService {
  private readonly repo: IPublishableRepository;
  private readonly validator: ValidationService;

  constructor(vaultRoot?: string, repo?: IPublishableRepository) {
    if (repo) {
      this.repo = repo;
    } else {
      const config = readConfigSync(CONFIG_PATH);
      const resolvedRoot =
        vaultRoot ?? config.vault ?? join(homedir(), ".publishable", "vault");
      this.repo = new LocalFileRepository(resolvedRoot);
    }
    this.validator = new ValidationService();
  }

  private async assertVaultInitialized(): Promise<void> {
    if (!(await this.repo.vaultExists())) {
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
    const schemaJson = await this.repo.readSchemaFile(resolvedSchema);

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
    const isNew = !(await this.repo.exists(handle));

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
      meta = await this.repo.readMeta(handle);
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

    await this.repo.writeMeta(meta);
    await this.repo.writeVersion(handle, version);

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
    const meta = await this.repo.readMeta(handle);
    return this.repo.readVersion(handle, meta.current_version);
  }

  async validate(
    fileContent: string,
    schema?: string,
  ): Promise<ValidationResult> {
    await this.assertVaultInitialized();
    const resolvedSchema = schema ?? "blog";
    const schemaJson = await this.repo.readSchemaFile(resolvedSchema);
    const parsed = matter(fileContent);
    const body = parsed.content.trimStart();
    return this.validator.validate(parsed.data, body, schemaJson);
  }

  async init(): Promise<{ schemas: string[]; created: string[] }> {
    await this.repo.ensureVaultDir();
    const created: string[] = [];
    for (const [name, schemaObj] of Object.entries(DEFAULT_SCHEMAS)) {
      if (!(await this.repo.schemaFileExists(name))) {
        await this.repo.writeSchemaFile(name, schemaObj);
        created.push(name);
      }
    }
    return { schemas: Object.keys(DEFAULT_SCHEMAS), created };
  }

  async versions(
    handle: string,
  ): Promise<{ handle: Handle; versions: number[]; current_version: number }> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.repo.readMeta(handle);
    const versions = await this.repo.listVersionNumbers(handle);
    return { handle, versions, current_version: meta.current_version };
  }

  async show(handle: string, version: number): Promise<PublishableVersion> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    await this.repo.readMeta(handle); // ensure publishable exists
    return this.repo.readVersion(handle, version);
  }

  async revert(
    handle: string,
    targetVersion: number,
    opts: { message?: string },
  ): Promise<PublishableSummary> {
    await this.assertVaultInitialized();
    this.assertValidHandle(handle);
    const meta = await this.repo.readMeta(handle);
    const oldVersion = await this.repo.readVersion(handle, targetVersion);

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

    await this.repo.writeVersion(handle, newVersion);
    await this.repo.writeMeta(updatedMeta);

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
    const handles = await this.repo.listHandles();
    const summaries: PublishableSummary[] = [];
    for (const handle of handles) {
      const meta = await this.repo.readMeta(handle);
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
    const meta = await this.repo.readMeta(handle);
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
