# publishable — Agent Skill Reference

## Purpose

`publishable` ensures content metadata is consistent at export time. Use any tools to draft content and any tools to publish — `publishable` sits in the middle: it tracks every version of your content and validates frontmatter fields (title, summary, tags, dates, etc.) against a schema you define, so every export is consistent.

Use it when you need to:

- Draft and iterate freely without validation pressure
- Enforce consistent metadata (frontmatter) at export time via a schema
- Export publish-ready content in markdown, body-only, or JSON format
- Browse or restore version history for a piece of content

**Common use cases:** Most static site generators (Astro, Hugo, Jekyll, Eleventy, Next.js) expect a markdown file per post with YAML frontmatter. Export your post as a complete markdown file — or as JSON — in the exact shape your site requires.

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

Example: a gardening website with posts for each plant, tracking plant name, sun requirements, and planting date.

```bash
# One-time setup
publishable init

# Draft posts freely — no validation, safe to run repeatedly
publishable update sunflowers --file sunflowers.md
publishable update tulips --file tulips.md
publishable update radishes --file radishes.md

# Iterate on a draft
publishable update sunflowers --file sunflowers.md

# Create a schema once (e.g. gardening: plant name, sun requirements, planting date)
publishable schema create gardening --file gardening-schema.json

# Check validity without blocking (exits 0 even if invalid)
publishable validate sunflowers --schema gardening

# Export publish-ready output — validates strictly, exits non-zero on failure
publishable export sunflowers --schema gardening --format md
```

## Commands

| Command                     | Description                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| `init`                      | Set up vault and config                                               |
| `update <handle>`           | Create or update content from a markdown file                         |
| `current <handle>`          | Read the current version                                              |
| `validate <handle>`         | Dry-run schema check (always exits 0)                                 |
| `export <handle>`           | Validate and output publish-ready content (exits non-zero on failure) |
| `versions <handle>`         | List version history                                                  |
| `show <handle> <version>`   | Read a specific version                                               |
| `revert <handle> <version>` | Create a new version from an older one                                |
| `list`                      | List all publishables                                                 |
| `get <handle>`              | Read publishable metadata                                             |
| `rename <handle> <new>`     | Rename a publishable to a new handle                                  |
| `delete <handle>`           | Permanently delete a publishable and all its versions                 |
| `schema`                    | Manage schemas (show, list, customize, create, update)                |

Run `publishable <command> --help` for full options on any command.

## Export Formats

`--format` options for `export`:

| Format | Output                                                     |
| ------ | ---------------------------------------------------------- |
| `md`   | Content frontmatter (title, slug, summary) + markdown body |
| `body` | Markdown body only                                         |
| `json` | Content fields as a JSON object                            |

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
