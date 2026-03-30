#!/usr/bin/env node
import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };

const program = new Command();

program
  .name("publishable")
  .description(
    "A tool for agents to manage blog and other publishable content.",
  )
  .version(pkg.version)
  .showHelpAfterError();

program.parse();
