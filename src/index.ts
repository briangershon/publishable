#!/usr/bin/env node
import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { updateCommand } from "./commands/update.js";
import { currentCommand } from "./commands/current.js";
import { validateCommand } from "./commands/validate.js";
import { versionsCommand } from "./commands/versions.js";
import { showCommand } from "./commands/show.js";
import { revertCommand } from "./commands/revert.js";
import { listCommand } from "./commands/list.js";
import { getCommand } from "./commands/get.js";

const program = new Command();

program
  .name("publishable")
  .description(
    "A tool for agents to manage blog and other publishable content.",
  )
  .version(pkg.version)
  .showHelpAfterError();

program.addHelpText(
  "after",
  `
Schema: publishable/v1
──────────────────────
Markdown files must include YAML frontmatter with these fields:

  Required:
    title    — string, non-empty
    slug     — lowercase alphanumeric + hyphens (e.g. "my-post-2024")
    summary  — string, non-empty
    tags     — list of strings, at least one required

  Injected by CLI (do NOT include in input files):
    version, schema, message, created_at, reverted_from

  Body:
    Must be non-empty and contain at least one markdown heading (# H1–H6)

Example file (post.md):
───────────────────────
  ---
  title: "Getting Started with the API"
  slug: getting-started-with-the-api
  summary: "A practical introduction to the API for new users."
  tags:
    - api
    - tutorial
  ---
  # Getting Started with the API

  Your content here...

Handle rules:
  Pattern: ^[a-z][a-z0-9-]*$
  Valid:   my-post, api-guide-2024
  Invalid: My-Post, my_post, 2024-guide

Storage:
  Default vault: ~/.publishable-vault/
  Override:      PUBLISHABLE_VAULT=/path/to/vault publishable <command>
`,
);

program
  .command("update <handle>")
  .description("Create or update a publishable from a markdown file")
  .requiredOption("--file <file>", "Path to markdown file")
  .option("--title <title>", "Title (required on first create if not in file)")
  .option("--message <msg>", "Version message")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  # Create new (title required on first create if not in frontmatter)
  publishable update my-post --file post.md --title "My Post"

  # Update existing with a version message
  publishable update my-post --file post.md --message "Fix typos"

  # With custom vault path
  PUBLISHABLE_VAULT=/tmp/test-vault publishable update my-post --file post.md
`,
  )
  .action(updateCommand);

program
  .command("current <handle>")
  .description("Read the current version of a publishable")
  .option("--output <file>", "Write content to file instead of stdout")
  .option("--json", "Output as JSON")
  .action(currentCommand);

program
  .command("validate")
  .description("Validate a markdown file against publishable/v1 schema")
  .requiredOption("--file <file>", "Path to markdown file")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable validate --file post.md
  publishable validate --file post.md --json

Note: Always exits 0 — this is a dry-run inspection tool. Only "update" exits
      non-zero on invalid content.
`,
  )
  .action(validateCommand);

program
  .command("versions <handle>")
  .description("List version history for a publishable")
  .option("--json", "Output as JSON")
  .action(versionsCommand);

program
  .command("show <handle> <version>")
  .description("Read a specific version of a publishable")
  .option("--output <file>", "Write content to file instead of stdout")
  .option("--json", "Output as JSON")
  .action(showCommand);

program
  .command("revert <handle> <version>")
  .description("Create a new current version from an older version")
  .option("--message <msg>", "Version message")
  .option("--json", "Output as JSON")
  .action(revertCommand);

program
  .command("list")
  .description("List all publishables")
  .option("--json", "Output as JSON")
  .action(listCommand);

program
  .command("get <handle>")
  .description("Read publishable metadata")
  .option("--json", "Output as JSON")
  .action(getCommand);

program.parse();
