export type Handle = string;

export const BUILTIN_SCHEMA_TYPES = [
  "blog",
  "linkedin",
  "bluesky",
  "x",
] as const;
export type BuiltinSchemaType = (typeof BUILTIN_SCHEMA_TYPES)[number];

export interface PublishableSchemaBody {
  required?: boolean;
  requireHeading?: boolean;
}

export interface PublishableSchema {
  [key: string]: unknown;
  "x-publishable"?: { body?: PublishableSchemaBody };
}

export interface PublishableMeta {
  handle: Handle;
  title: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface VersionFrontmatter {
  version: number;
  schema?: string;
  message: string;
  created_at: string;
  title: string;
  slug?: string;
  summary?: string;
  tags?: string[];
  reverted_from?: number;
}

export type ExportFormat = "md" | "body" | "json";

export interface PublishableVersion {
  frontmatter: VersionFrontmatter;
  body: string;
}

export interface PublishableSummary {
  handle: Handle;
  title: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface ValidationError {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  schema?: string;
  errors: ValidationError[];
}

export type ErrorCode =
  | "PUBLISHABLE_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "INVALID_HANDLE"
  | "SCHEMA_NOT_FOUND"
  | "SCHEMA_VALIDATION_FAILED"
  | "FILE_NOT_FOUND"
  | "STORAGE_ERROR"
  | "VAULT_NOT_INITIALIZED";

export interface SuccessOutput<T> {
  ok: true;
  data: T;
}

export interface ErrorOutput {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationError[];
  };
}

export type Output<T> = SuccessOutput<T> | ErrorOutput;
