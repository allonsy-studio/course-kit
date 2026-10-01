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
