# @briangershon/publishable

A tool for creating and managing content for publication.

## Installation

```bash
npm install -g @briangershon/publishable
```

## Usage

```bash
npx @briangershon/publishable --help
```

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

**First-time setup:** Add `NPM_TOKEN` and `OPENROUTER_API_KEY` secrets in GitHub repo Settings → Secrets and variables → Actions. Also run `npm login` locally and ensure you have access to the `@briangershon` scope.

## License

MIT
