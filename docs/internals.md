# Internals

Constraints the code works around. Each has a one-line pointer in the source.

## Called, not added as a plugin

Eleventy rejects `set*Directory` inside a plugin, and `courseKit` sets the input,
output, includes, layouts and data directories. A course calls it directly.

## Components, assets and glue

- **Component names are global.** WebC throws on a duplicate name, so a glob
  cannot make a course's component win. `componentFiles` drops package
  components the course also defines.
- **`assetPath` is the one way to read a package asset.** The course's copy wins,
  then the package's. Bundling, font inlining and demo stylesheets all use it.
- **Virtual templates and the student build.** Path-based `ignores` do not apply
  to templates added with `config.addTemplate`, so a glue page that must stay out
  of the student build sets `instructorOnly: true`.
- **No passthrough copy for scripts.** The `js` extension already writes every
  script to `/js/<basename>`. A passthrough copy to the same path races the
  compiled output and can overwrite the bundle with raw source, which then fails
  to parse ("Unexpected end of input").
- **Virtual scripts bundle from stdin.** A package script has no file in the
  course repo, so esbuild reads it from stdin with the package directory as its
  resolve directory.

## Vendor files

Prism themes and plugins are resolved with `require.resolve`, never a hand-built
`node_modules` path, which copies nothing and fails silently under a different
linker.

## CSS

- Only `_`-prefixed `@import`s are inlined by PostCSS; `font.css` is left in
  place and replaced after rendering.
- `cssnano` runs in development too, so development CSS is minified. Source maps
  are inline in development and off in production.
- Production builds are deterministic; development builds are not, because each
  PostCSS input carries a random id in its source map.

## Output directory

Eleventy reports its default output directory (`_site`) on `eleventy.after`, not
the one set with `setOutputDirectory`. The PDF and fit hooks take `outputDir`
from the options instead.

## WebC behavior to design around

Each of these was found by building, not by reading the docs.

- **A setup script cannot see props.** `<script webc:setup>` reads `$data` and the filters, but a bare `level` or `prefix` passed with `@level` is `undefined` there, with no error. Read props in template expressions (`webc:if="level == 2"`), and give setup helpers the prop as an argument (`detail(item, prefix)`). For "prop wins, else page data", compute the default in setup and write `(weeks ?? defaultWeeks)` in the template.
- **Slot content sees the component's props.** A host that loops with `webc:for="week of weeks"` and passes `:@week="week.week"` shadows its own loop variable inside the slot, and the slot renders `[object Object]`. Name the prop differently from the host's variable (`week-block` takes `number`).
- **A component with no markup is not resolved.** One that only carries a script and a style leaves its tag in the page and its assets unbundled. Give it a root, such as `<template webc:root="override" webc:nokeep></template>`.
- **Dynamic `webc:is` does not resolve.** `:webc:is="'practice-' + q.kind"` is printed as an attribute and renders nothing; only a static `webc:is="name"` works. Dispatch with `webc:if`.
- **`:host + :host` is not rewritten** by `webc:scoped`, so the sibling rule never matches. Use `:host:not(:first-child)`.
- **Putting a class on a heading changes its weight.** The base stylesheet styles `h3:not([class])` as medium, so a classed `h3` falls back to the browser's bold. `week-block` sets it back.
- **The page's own `lesson-day` wins over the glue page.** A course that still has `content/lessons/lesson-day.webc` never gets the computed `lessonMaterials`.
