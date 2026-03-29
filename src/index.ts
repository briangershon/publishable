#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`Usage: publishable [OPTIONS]

A tool for agents to manage blog and other publishable content.

Options:
  -h, --help    Show this message and exit

Examples:
  publishable --help`);
  process.exit(0);
}
