# @briangershon/publishable

A content management tool for creating publishable posts with standardized metadata, built-in validation, and full version history.

- Prevents missing publishing fields by standardizing required inputs, with sample schemas for blog posts, LinkedIn articles, Bluesky posts, and X posts. You can also customize existing schemas or create your own.
- Saves every revision, making it easy to review changes or restore earlier versions.

## Installation

```bash
npm install -g @briangershon/publishable
```

## Usage

```bash
npx @briangershon/publishable --help
```

## Workflow

### 1. Set up your vault (first time only)

```bash
publishable init
```

### 2. Write and save drafts freely

Create a markdown file with your content. Frontmatter fields are optional while drafting — no validation happens at save time.

```bash
publishable update my-post --file draft.md
```

Keep iterating. Every save creates a new version in the vault:

```bash
publishable update my-post --file draft.md --message "Improve intro"
```

Review your version history at any time:

```bash
publishable versions my-post
publishable show my-post 1
```

### 3. Check for errors (optional)

```bash
publishable validate my-post --schema blog
```

This is a dry-run — it always exits 0 and never saves anything.

### 4. Export when ready

`export` validates and renders clean output in one step. It exits non-zero if validation fails, so you know the content is ready before you use it.

```bash
# Clean markdown for Hugo, Jekyll, Astro, or any file-based blog
publishable export my-post --format md --output final.md

# Just the body text — paste into LinkedIn, Bluesky, X
publishable export my-post --format body

# Structured JSON for a CMS API or pipeline
publishable export my-post --format json
```

To target a specific schema:

```bash
publishable export my-li-post --schema linkedin --format body
```

### Built-in schemas

| Schema           | Required fields                    | Body                        |
| ---------------- | ---------------------------------- | --------------------------- |
| `blog` (default) | `title`, `slug`, `summary`, `tags` | Must start with `# heading` |
| `linkedin`       | `title`, `summary` (≤3000 chars)   | Required                    |
| `bluesky`        | `title`, `summary` (≤300 chars)    | Required                    |
| `x`              | `title`, `summary` (≤280 chars)    | Required                    |

Custom schemas: drop any JSON Schema 2020-12 file into `{vault}/schemas/<name>.json` and use `--schema <name>`.

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
