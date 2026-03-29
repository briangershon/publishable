# @briangershon/publishable

A tool for agents to manage blog and other publishable content.

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

```bash
npm run build
npm publish --access public
```

First-time setup: `npm login` and ensure you have access to the `@briangershon` scope.

## License

MIT
