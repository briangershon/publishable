import type {
  Handle,
  PublishableMeta,
  PublishableSchema,
  PublishableVersion,
} from "../types.js";

export interface IPublishableRepository {
  // Vault lifecycle
  vaultExists(): Promise<boolean>;
  ensureVaultDir(): Promise<void>;

  // Schemas
  schemaFileExists(name: string): Promise<boolean>;
  readSchemaFile(name: string): Promise<PublishableSchema>;
  writeSchemaFile(name: string, schema: object): Promise<void>;

  // Publishables
  exists(handle: Handle): Promise<boolean>;
  readMeta(handle: Handle): Promise<PublishableMeta>;
  writeMeta(meta: PublishableMeta): Promise<void>;
  listHandles(): Promise<Handle[]>;

  // Versions
  readVersion(handle: Handle, version: number): Promise<PublishableVersion>;
  writeVersion(handle: Handle, version: PublishableVersion): Promise<void>;
  listVersionNumbers(handle: Handle): Promise<number[]>;
}
