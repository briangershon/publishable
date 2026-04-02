# AGENTS.md — Engineering Decisions and Rules

This file documents key engineering decisions for the `publishable` CLI and rules for AI agents working in this codebase.

---

## Documentation Scope

Each file has a distinct, non-overlapping purpose. Do not add content to a file that belongs in another.

| File        | Audience                                              | Contains                                                    |
| ----------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `--help`    | CLI users / agents running the tool                   | Canonical command reference: all commands, options, formats |
| `README.md` | GitHub browsers / developers discovering the project  | Tagline, install, minimal quickstart, built-in schema names |
| `AGENTS.md` | Developers / AI coding agents working on the codebase | Engineering rules, architecture decisions, test patterns    |

If you are adding a new command or option, update the CLI help text — not README or AGENTS.md.

**Schema details belong in code only.** Do not write schema field requirements, character limits, or body constraints to README, AGENTS.md, or CLI help text. Only list the names of built-in schemas and the file where they are defined (`src/schemas/defaults.ts`). This prevents docs from going stale when schemas change.

---

## CLI Name

The binary is `publishable`. Always use `publishable` in code, docs, and tests.
Invoke it via `npm run dev --` (e.g. `npm run dev -- update my-post --file draft.md`).

## Storage Root

Default vault: `~/.publishable/vault/`

Config file: `~/.publishable/config.json` — set once with:

```bash
publishable init --vault /path/to/vault
```

In tests, pass the vault root and an InMemoryFileSystem to the constructor:

```typescript
const fs = new InMemoryFileSystem();
const svc = new PublishableService("/tmp/test-vault", fs);
await svc.init();
```

## File Format

Version files (`vN.md`) use a single frontmatter block containing both version metadata and content metadata, followed by the markdown body.

```
---
version: 2
schema: blog/v1
message: "Improve intro"
created_at: 2026-03-29T18:20:00Z
title: "My Post Title"
slug: my-post-title
summary: "A short summary."
---
# My Post Title

...body content...
```

Metadata files (`publishable.md`) contain only frontmatter with an empty body.

## Schemas

There is 1 built-in schema: `blog`. It is defined in `src/schemas/defaults.ts`. Schemas are **not** written to disk during `init` — they are only created when a user customizes one via `publishable schema customize <name>`.

Every `validate` and `export` invocation requires an explicit choice: `--schema <name>` to validate, or `--no-schema` to skip validation. Omitting both is an error. This ensures validation intent is always visible in scripts and command history.

The `schema: {name}/v1` field in version files (e.g. `schema: blog/v1`) is **injected by the CLI** during write. It is NOT required in the user's input markdown file. The ValidationService does not check for it.

## Content Workflow

Content moves through three stages:

1. **`update`** — Saves content without any validation. Use freely while drafting. Always succeeds (no schema checks).
2. **`validate`** — Dry-run schema inspection. Reports errors but always exits `0`. Requires `--schema <name>` or `--no-schema`.
3. **`export`** — Outputs clean content. Requires `--schema <name>` or `--no-schema`. With `--schema`, validates strictly and exits non-zero if validation fails.

Export formats (`--format`):

- `md` — Content-only frontmatter (title, slug, summary) + body
- `body` — Markdown body only
- `json` — Content fields as a plain JSON object

## Duplicate Content

Duplicate content **is allowed** to create a new version. There is no content deduplication in Phase 0. This is simpler and more predictable.

## Revert Semantics

`publishable revert <handle> <version>` **creates a new version** with identical content to the specified old version. It does NOT move the `current_version` pointer backward. The new version includes a `reverted_from` field.

## validate Command Exit Code

`publishable validate --file <file>` exits **0** even when content is invalid. It is a dry-run inspection tool. Only `export` exits non-zero on invalid content.

## Handle Rules

Handles must match: `^[a-z][a-z0-9-]*$`

- Lowercase only
- Kebab-case (hyphens allowed, not underscores)
- Must start with a letter
- No uppercase, no special characters

Examples of valid handles: `my-post`, `phase-0-spec`, `api-guide-2024`

## Architecture Layers

| Layer                | Location                               | Responsibility                               |
| -------------------- | -------------------------------------- | -------------------------------------------- |
| Schema definitions   | `src/schemas/defaults.ts`              | Built-in JSON schema for blog                |
| CLI wiring           | `src/index.ts`                         | Register commander commands                  |
| Command handlers     | `src/commands/*.ts`                    | Thin: call service, call output helper       |
| Business logic       | `src/services/PublishableService.ts`   | Orchestrate validation + storage             |
| Validation           | `src/services/ValidationService.ts`    | Returns result, never throws                 |
| Filesystem interface | `src/filesystem/IFileSystem.ts`        | Abstraction for all fs I/O (6 async methods) |
| Filesystem (real)    | `src/filesystem/NodeFileSystem.ts`     | Node.js `fs/promises` wrapper                |
| Filesystem (test)    | `src/filesystem/InMemoryFileSystem.ts` | In-memory mock used in all tests             |
| Types                | `src/types.ts`                         | Shared TypeScript interfaces                 |
| Errors               | `src/utils/errors.ts`                  | `PublishableError` class                     |
| Output               | `src/utils/output.ts`                  | Human-readable and JSON output               |

## Tests

Test files live **next to the source file they test**, named `<module>.test.ts`:

```
src/services/PublishableService.test.ts
src/services/ValidationService.test.ts
src/utils/config.test.ts
src/utils/errors.test.ts
src/utils/output.test.ts
```

Run tests with `npm test`. Coverage report with `npm run test:coverage`. Both are included in `npm run check`.

All `PublishableService` tests use `InMemoryFileSystem` — no real disk I/O. Inject it via the second constructor argument:

```typescript
import { InMemoryFileSystem } from "../filesystem/InMemoryFileSystem.js";

const fs = new InMemoryFileSystem();
const svc = new PublishableService("/tmp/test-vault", fs);
await svc.init();
```

Use `vi.spyOn(process, "exit")` to assert on exit calls without actually exiting, and `vi.spyOn(console, "log")` / `vi.spyOn(console, "error")` for output assertions.

## Development Workflow

| Script                  | What it does                                                              |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run dev`           | Run CLI directly via `tsx` (no build step)                                |
| `npm run build`         | Compile TypeScript to `dist/`, set executable bit                         |
| `npm test`              | Run all tests with Vitest                                                 |
| `npm run test:coverage` | Run tests with v8 coverage report                                         |
| `npm run lint`          | Lint `src/` with oxlint                                                   |
| `npm run format`        | Format all files with Prettier                                            |
| `npm run check`         | lint + tsc --noEmit + prettier --check + test (**run before committing**) |

Always run `npm run check` before committing or submitting changes.

Run any `publishable` command via `npm run dev --`:

```bash
npm run dev -- <command> [options]
# e.g.
npm run dev -- update my-post --file draft.md
npm run dev -- export my-post --format md
```

Never inspect or edit vault files directly. The vault (`~/.publishable/vault/`) is an internal implementation detail — all reads and writes must go through `publishable` commands. Direct edits bypass validation, version tracking, and schema injection.

## ValidationService Contract

`ValidationService.validate()` **returns** a `ValidationResult`, it never throws. Callers decide whether to throw `SCHEMA_VALIDATION_FAILED`. This keeps validation reusable for both `validate` (dry-run) and `export` (throws on invalid).

## Error Codes

| Code                       | Meaning                                           |
| -------------------------- | ------------------------------------------------- |
| `PUBLISHABLE_NOT_FOUND`    | Handle does not exist in the vault                |
| `VERSION_NOT_FOUND`        | Version number does not exist for handle          |
| `INVALID_HANDLE`           | Handle fails regex validation                     |
| `SCHEMA_NOT_FOUND`         | Schema name does not exist in `vault/schemas/`    |
| `SCHEMA_ALREADY_EXISTS`    | Schema with that name already exists              |
| `SCHEMA_REQUIRED`          | Neither `--schema` nor `--no-schema` was provided |
| `INVALID_SCHEMA`           | Schema file is not a valid JSON Schema document   |
| `SCHEMA_VALIDATION_FAILED` | Content failed schema validation                  |
| `FILE_NOT_FOUND`           | Input `--file` path does not exist                |
| `STORAGE_ERROR`            | Filesystem read/write failure                     |
| `VAULT_NOT_INITIALIZED`    | Vault directory not found; run `publishable init` |

## Concurrency

Concurrent writes to the same publishable are **not safe** in Phase 0. This is out of scope. Do not add locking or queuing unless explicitly asked.

## Output JSON Envelope

All `--json` output follows this envelope:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "...", "message": "...", "details": [...] } }
```

Exit code is always `0` on success and non-zero on any error.
