export type Handle = string;

export interface PublishableMeta {
  handle: Handle;
  title: string;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface VersionFrontmatter {
  version: number;
  schema: "publishable/v1";
  message: string;
  created_at: string;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  reverted_from?: number;
}

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
  errors: ValidationError[];
}

export type ErrorCode =
  | "PUBLISHABLE_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "INVALID_HANDLE"
  | "TITLE_REQUIRED_ON_CREATE"
  | "SCHEMA_VALIDATION_FAILED"
  | "FILE_NOT_FOUND"
  | "STORAGE_ERROR";

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
