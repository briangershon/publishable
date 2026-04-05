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
import { renameCommand } from "./commands/rename.js";
import { deleteCommand } from "./commands/delete.js";
import {
  schemaShowCommand,
  schemaListCommand,
  schemaCreateCommand,
  schemaCustomizeCommand,
  schemaUpdateCommand,
} from "./commands/schema.js";

const program = new Command();

program
  .name("publishable")
  .description(
    "Ensures your content metadata is consistent at export time. Use any tools to draft and publish — publishable tracks versions and validates frontmatter fields against a schema you define.",
  )
  .version(pkg.version)
  .showHelpAfterError();

program.addHelpText(
  "after",
  `
Workflow:
─────────
  1. publishable init                                              # set up vault (one-time)
  2. publishable update sunflowers --file sunflowers.md           # create draft, no validation
     publishable update tulips --file tulips.md                   # create more drafts
     publishable update radishes --file radishes.md
  3. publishable update sunflowers --file sunflowers.md           # keep iterating freely
  4. publishable schema create gardening --file gardening.json    # create a schema (one-time)
  5. publishable export sunflowers --schema gardening --format md # validate + get clean output
     publishable export sunflowers --schema gardening --format body # paste-ready body text

Built-in schemas (used with "export" and "validate"):
  blog
  Run "publishable schema show <name>" to inspect a schema.

Custom schemas:
  Use "publishable schema --help" to list, create, and update schemas.

Example gardening file:
───────────────────────
  ---
  plant_name: "Sunflower"
  sun: "full sun"
  planted_date: "2026-03-15"
  ---
  # Sunflower

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
Run this first to set up your publishable vault. Creates the vault directory.

Built-in schema (blog) are available immediately — no
files are written. To customize a built-in schema, run:
  publishable schema customize <name>
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
  .option("--schema <type>", "Schema to validate against (e.g. blog)")
  .option("--no-schema", "Skip schema validation explicitly")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable validate my-post --schema blog
  publishable validate my-social-post --no-schema
  publishable validate my-post --schema blog --json

Note: Always exits 0 on valid/invalid content (dry-run). Use "export" to
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
  .option("--schema <type>", "Schema to validate against (e.g. blog)")
  .option("--no-schema", "Skip schema validation explicitly")
  .option("--output <file>", "Write output to file instead of stdout")
  .option("--json", "Output as JSON envelope")
  .addHelpText(
    "after",
    `
Outputs clean content. Use --schema to validate first (exits non-zero on
failure), or --no-schema for body-only content with no frontmatter validation.

Formats:
  md    — content-only frontmatter (title, slug, summary) + body
  body  — just the markdown body text
  json  — content fields as a plain JSON object

Examples:
  publishable export my-post --schema blog
  publishable export my-post --schema blog --format md --output clean.md
  publishable export my-social-post --no-schema --format body
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

program
  .command("rename <handle> <new-handle>")
  .description("Rename a publishable to a new handle")
  .option("--json", "Output as JSON")
  .action(renameCommand);

program
  .command("delete <handle>")
  .description("Permanently delete a publishable and all its versions")
  .option("--json", "Output as JSON")
  .action(deleteCommand);

const schemaCmd = program
  .command("schema")
  .description("Manage schemas in the vault");

schemaCmd
  .command("show <name>")
  .description("Show schema details")
  .option("--json", "Output full JSON Schema")
  .addHelpText(
    "after",
    `
Examples:
  publishable schema show blog
  publishable schema show blog --json
`,
  )
  .action(schemaShowCommand);

schemaCmd
  .command("list")
  .description("List all available schemas in the vault")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable schema list
  publishable schema list --json
`,
  )
  .action(schemaListCommand);

schemaCmd
  .command("customize <name>")
  .description("Write a built-in schema to disk for customization")
  .option("--force", "Overwrite an existing custom schema file")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Copies the built-in default schema to {vault}/schemas/<name>.json so you can
edit it. Once the file exists, publishable uses your version instead of the
built-in default.

Examples:
  publishable schema customize blog
  publishable schema customize blog --force
`,
  )
  .action(schemaCustomizeCommand);

schemaCmd
  .command("create <name>")
  .description("Create a new schema from a JSON file")
  .requiredOption("--file <file>", "Path to JSON Schema file")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable schema create newsletter --file newsletter.json

Note: Fails if the schema already exists. Use "schema update" to replace it.
`,
  )
  .action(schemaCreateCommand);

schemaCmd
  .command("update <name>")
  .description("Update an existing schema from a JSON file")
  .requiredOption("--file <file>", "Path to JSON Schema file")
  .option("--json", "Output as JSON")
  .addHelpText(
    "after",
    `
Examples:
  publishable schema update newsletter --file newsletter.json

Note: Fails if the schema does not exist. Use "schema create" to add a new one.
`,
  )
  .action(schemaUpdateCommand);

program.parse();
