# publishable — Agent Skill Reference

## Purpose

`publishable` is a CLI for creating, versioning, validating, and exporting structured content (blog posts, etc.) with standardized metadata. Use it when you need to:

- Draft and iterate on content without validation pressure
- Validate content against a schema before publishing
- Export publish-ready content in markdown, body-only, or JSON format
- Browse or restore version history for a piece of content

## Installation

```bash
npm install -g @briangershon/publishable
```

Requires Node.js >= v22.22.2.

## First-Time Setup

```bash
publishable init
# or specify a custom vault location:
publishable init --vault /path/to/vault
```

This creates the vault directory (default: `~/.publishable/vault/`) and saves config to `~/.publishable/config.json`.

## Getting Help

The CLI is self-documenting. Always check `--help` for full options and examples:

```bash
publishable --help
publishable <command> --help    # e.g. publishable export --help
publishable schema --help
publishable schema <subcommand> --help
```

## Core Workflow

Content moves through three stages:

```bash
# 1. Save a draft — no validation, safe to run repeatedly while writing
publishable update my-post --file draft.md

# 2. Check validity without blocking (exits 0 even if invalid)
publishable validate my-post --schema blog

# 3. Export publish-ready output — validates strictly, exits non-zero on failure
publishable export my-post --schema blog --format md
```

## Commands

| Command | Description |
|---|---|
| `init` | Set up vault and config |
| `update <handle>` | Create or update content from a markdown file |
| `current <handle>` | Read the current version |
| `validate <handle>` | Dry-run schema check (always exits 0) |
| `export <handle>` | Validate and output publish-ready content (exits non-zero on failure) |
| `versions <handle>` | List version history |
| `show <handle> <version>` | Read a specific version |
| `revert <handle> <version>` | Create a new version from an older one |
| `list` | List all publishables |
| `get <handle>` | Read publishable metadata |
| `schema` | Manage schemas (show, list, customize, create, update) |

Run `publishable <command> --help` for full options on any command.

## Export Formats

`--format` options for `export`:

| Format | Output |
|---|---|
| `md` | Content frontmatter (title, slug, summary) + markdown body |
| `body` | Markdown body only |
| `json` | Content fields as a JSON object |

## Schemas

The built-in schema is `blog`. Inspect it with:

```bash
publishable schema show blog
publishable schema show blog --json
```

To customize or create schemas:

```bash
publishable schema customize blog          # copy built-in to disk for editing
publishable schema create my-schema --file schema.json
```

Every `validate` and `export` call requires an explicit schema choice:

```bash
publishable export my-post --schema blog    # validate against blog schema
publishable export my-post --no-schema      # skip validation explicitly
```

Omitting both `--schema` and `--no-schema` is an error.

## JSON Output

All commands support `--json` for machine-readable output:

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "...", "message": "..." } }
```

## Handle Rules

Handles must be lowercase kebab-case, starting with a letter: `^[a-z][a-z0-9-]*$`

Valid: `my-post`, `api-guide-2024`  
Invalid: `My-Post`, `my_post`, `2024-guide`
