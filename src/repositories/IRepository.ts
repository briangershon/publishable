import type {
  Handle,
  PublishableMeta,
  PublishableSchema,
  PublishableVersion,
} from "../types.js";

export interface IRepository {
  // Vault lifecycle
  vaultExists(): Promise<boolean>;
  ensureVaultDir(): Promise<void>;

  // Schemas
  readSchemaFile(name: string): Promise<PublishableSchema>;
  writeSchemaFile(name: string, schema: object): Promise<void>;

  // Publishables
  readMeta(handle: Handle): Promise<PublishableMeta>;
  writeMeta(meta: PublishableMeta): Promise<void>;
  listHandles(): Promise<Handle[]>;

  // Versions
  readVersion(handle: Handle, version: number): Promise<PublishableVersion>;
  writeVersion(handle: Handle, version: PublishableVersion): Promise<void>;
  listVersionNumbers(handle: Handle): Promise<number[]>;
}
