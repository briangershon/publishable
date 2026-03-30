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

program
  .command("update <handle>")
  .description("Create or update a publishable from a markdown file")
  .requiredOption("--file <file>", "Path to markdown file")
  .option("--title <title>", "Title (required on first create if not in file)")
  .option("--message <msg>", "Version message")
  .option("--json", "Output as JSON")
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
