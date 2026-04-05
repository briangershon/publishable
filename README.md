# @briangershon/publishable

A content management tool for creating publishable posts with standardized metadata, built-in validation, and full version history.

- Prevents missing publishing fields by standardizing required inputs, with a built-in schema for blog posts. You can also customize existing schemas or create your own.
- Saves every revision, making it easy to review changes or restore earlier versions.

## Installation

```bash
npm install -g @briangershon/publishable
```

## Usage

```bash
npx @briangershon/publishable --help
```

## Quickstart

Imagine you're running a gardening website. Each post covers a specific plant and needs structured metadata: plant name, sun requirements, and planting date. Here's how to draft, validate, and export those posts with `publishable`:

| Claude Code Prompt | CLI Command |
| --- | --- |
| "Set up my publishable vault" _(one-time setup)_ | `publishable init` |
| "Create a draft for a gardening post about sunflowers. Include plant name, sun requirements, and planting date." | `publishable update sunflowers --file sunflowers.md` |
| "Create a draft for my tulips post" | `publishable update tulips --file tulips.md` |
| "Create a draft for my radishes post" | `publishable update radishes --file radishes.md` |
| "Update my sunflowers draft with the latest notes" | `publishable update sunflowers --file sunflowers.md` |
| "Create a gardening schema that requires plant name, sun requirements, and planting date" _(one-time per schema)_ | `publishable schema create gardening --file gardening-schema.json` |
| "Export my sunflowers post using the gardening schema as markdown" | `publishable export sunflowers --schema gardening --format md` |

## Built-in schemas

Built-in schema: `blog`. Run `publishable schema show blog` to inspect it.

Social and body-only content (LinkedIn, Bluesky, X, etc.) doesn't require a schema — use `--no-schema` on `validate` and `export` to explicitly skip frontmatter validation.

Custom schemas: run `publishable schema --help` for details.

## Local Development

Run directly from source without a build step (requires Node 22.6+):

```bash
npm run dev -- --help
```

## Publishing package to npm

After merging latest code to main branch:

1. `git checkout main && git pull`
2. `npm version patch` # or `minor`, or `major`
3. `git push --follow-tags`

A GitHub release is automatically written and published to NPM.

**First-time setup:**

1. Add `OPENROUTER_API_KEY` secret in GitHub repo Settings → Secrets and variables → Actions.
2. Run `npm login` locally and ensure you have access to the `@briangershon` scope.
3. Manually publish the package once to establish it on npm: `npm publish --access public`
4. Set up [npm Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements) in your npm package settings to allow the GitHub Actions workflow to publish without a stored token.

## License

MIT
