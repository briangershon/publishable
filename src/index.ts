#!/usr/bin/env node
import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { initCommand } from "./commands/init.js";
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
    "A content management tool for creating publishable posts with standardized metadata, built-in validation, and full version history.",
  )
  .version(pkg.version)
  .showHelpAfterError();

program.addHelpText(
  "after",
  `
Built-in schemas (run "publishable init" to write these to your vault):
───────────────────────────────────────────────────────────────────────
  blog      — title, slug, summary, tags required; body must have heading
  linkedin  — title, summary (≤3000 chars) required; body required
  bluesky   — title, summary (≤300 chars) required; body required
  x         — title, summary (≤280 chars) required; body required

Custom schemas:
  Drop any JSON Schema 2020-12 file into {vault}/schemas/<name>.json,
  then use --schema <name> to validate against it.

Example blog file:
──────────────────
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

Fields injected by CLI (do NOT include in input files):
  version, schema, message, created_at, reverted_from

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
  .command("init")
  .description(
    "Initialize vault with default schemas (blog, linkedin, bluesky, x)",
  )
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Writes default JSON Schema files to {vault}/schemas/:
  blog.json, linkedin.json, bluesky.json, x.json

Safe to re-run — overwrites existing default schemas.
Custom schemas in the same directory are not affected.
`,
  )
  .action(initCommand);

program
  .command("update <handle>")
  .description("Create or update a publishable from a markdown file")
  .requiredOption("--file <file>", "Path to markdown file")
  .option("--title <title>", "Title (required on first create if not in file)")
  .option("--message <msg>", "Version message")
  .option("--schema <type>", "Schema name (default: blog)", "blog")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  # Create new blog post (title required on first create if not in frontmatter)
  publishable update my-post --file post.md --title "My Post"

  # Create a LinkedIn post
  publishable update my-li-post --file linkedin.md --schema linkedin

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
  .description("Validate a markdown file against a schema")
  .requiredOption("--file <file>", "Path to markdown file")
  .option("--schema <type>", "Schema name (default: blog)", "blog")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable validate --file post.md
  publishable validate --file post.md --schema linkedin
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
