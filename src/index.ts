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
import { exportCommand } from "./commands/export.js";

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
Workflow:
─────────
  1. publishable update my-post --file draft.md   # save draft, no validation
  2. publishable update my-post --file draft.md   # keep iterating freely
  3. publishable export my-post --format md       # validate + get clean output
     publishable export my-post --format body     # paste-ready body text

Built-in schemas (used with "export" and "validate"):
──────────────────────────────────────────────────────
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

Handle rules:
  Pattern: ^[a-z][a-z0-9-]*$
  Valid:   my-post, api-guide-2024
  Invalid: My-Post, my_post, 2024-guide

Storage:
  Default vault: ~/.publishable/vault/
  Config file:   ~/.publishable/config.json
  Set vault:     publishable init --vault <path>
`,
);

program
  .command("init")
  .description("Set up your publishable vault and install default schemas")
  .option(
    "--vault <path>",
    "Path to vault directory (saved to ~/.publishable/config.json)",
  )
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Run this first to set up your publishable vault. Creates the vault directory
and installs default JSON Schema files into {vault}/schemas/:
  blog.json, linkedin.json, bluesky.json, x.json

Safe to re-run — already-existing schemas are not overwritten.
`,
  )
  .action(initCommand);

program
  .command("update <handle>")
  .description("Create or update a publishable from a markdown file")
  .requiredOption("--file <file>", "Path to markdown file")
  .option("--message <msg>", "Version message")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  # Create a new publishable (no validation — draft freely)
  publishable update my-post --file draft.md

  # Save a new version with a message
  publishable update my-post --file post.md --message "Improve intro"
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
  .command("validate <handle>")
  .description("Validate the current version of a publishable against a schema")
  .option("--schema <type>", "Schema name (default: blog)", "blog")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable validate my-post
  publishable validate my-post --schema linkedin
  publishable validate my-post --json

Note: Always exits 0 — this is a dry-run inspection tool. Use "export" to
      validate and get output in one step (exits non-zero on invalid content).
`,
  )
  .action(validateCommand);

program
  .command("export <handle>")
  .description("Validate and export a publishable in a publish-ready format")
  .option(
    "--format <format>",
    "Output format: md, body, or json (default: md)",
    "md",
  )
  .option(
    "--schema <type>",
    "Schema to validate against (default: blog)",
    "blog",
  )
  .option("--output <file>", "Write output to file instead of stdout")
  .option("--json", "Output as JSON envelope")
  .addHelpText(
    "after",
    `
Validates the current version against a schema, then outputs clean content.
Exits non-zero if validation fails.

Formats:
  md    — content-only frontmatter (title, slug, summary, tags) + body
  body  — just the markdown body text (paste into LinkedIn, Bluesky, X, etc.)
  json  — content fields as a plain JSON object

Examples:
  publishable export my-post
  publishable export my-post --format body
  publishable export my-post --format md --output clean.md
  publishable export my-li-post --schema linkedin --format body
`,
  )
  .action(exportCommand);

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
