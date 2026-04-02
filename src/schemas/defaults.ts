export const BLOG_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Blog Post",
  type: "object",
  required: ["title", "slug", "summary"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      maxLength: 200,
      description: "Post title",
    },
    slug: {
      type: "string",
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      maxLength: 100,
      description: "URL-safe slug (lowercase, alphanumeric, hyphens only)",
    },
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 300,
      description: "Short description of the post",
    },
  },
  "x-publishable": {
    body: { required: true },
  },
};

export const DEFAULT_SCHEMAS: Record<string, object> = {
  blog: BLOG_SCHEMA,
};
