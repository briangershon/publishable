export const BLOG_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Blog Post",
  type: "object",
  required: ["title", "slug", "summary"],
  properties: {
    title: { type: "string", minLength: 1, description: "Post title" },
    slug: {
      type: "string",
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      description: "URL-safe slug (lowercase, alphanumeric, hyphens only)",
    },
    summary: {
      type: "string",
      minLength: 1,
      description: "Short description of the post",
    },
  },
  "x-publishable": {
    body: { required: true },
  },
};

export const LINKEDIN_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "LinkedIn Post",
  type: "object",
  required: ["title", "summary"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      description: "Internal label for the post",
    },
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 3000,
      description: "Post text (3000 character limit)",
    },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1 },
      description: "Hashtags for the post",
    },
  },
  "x-publishable": {
    body: { required: true },
  },
};

export const BLUESKY_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Bluesky Post",
  type: "object",
  required: ["title", "summary"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      description: "Internal label for the post",
    },
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 300,
      description: "Post text (300 character limit)",
    },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1 },
      description: "Hashtags for the post",
    },
  },
  "x-publishable": {
    body: { required: true },
  },
};

export const X_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "X Post",
  type: "object",
  required: ["title", "summary"],
  properties: {
    title: {
      type: "string",
      minLength: 1,
      description: "Internal label for the post",
    },
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 280,
      description: "Post text (280 character limit)",
    },
    tags: {
      type: "array",
      items: { type: "string", minLength: 1 },
      description: "Hashtags for the post",
    },
  },
  "x-publishable": {
    body: { required: true },
  },
};

export const DEFAULT_SCHEMAS: Record<string, object> = {
  blog: BLOG_SCHEMA,
  linkedin: LINKEDIN_SCHEMA,
  bluesky: BLUESKY_SCHEMA,
  x: X_SCHEMA,
};
