# Testing a change

Two layers.

## Unit tests

```sh
yarn test
```

Covers the helpers, filters, markdown, worksheet preparation, PostCSS, the data and option checks, the component conventions and the documentation.

Two tests keep the kit honest for a new author:

- `test/starter.test.js` builds [`examples/starter`](../examples/starter) with Eleventy and checks the pages, that no component tag or placeholder is left in the output, and that the starter's data files match the shipped schemas. If you change a component or a data file's shape, this is the test that tells you a new course would break.
- `test/docs.test.js` checks that every link in the README and `docs/` points at a file and heading that exist.

`docs/components-reference.md` and `docs/tokens.md` are generated; the tests fail when they are out of date. Run `yarn docs` or `yarn schema` to rewrite them.

The starter covers a typical course. The plugin as a whole is still verified against real courses by the golden builds below.

## Golden builds against a course

A change is sound when a real course builds byte-identically before and after.

1. Build the course from a clean checkout with `ELEVENTY_ENV=production`, once
   per audience (`AUDIENCE=instructor`, `AUDIENCE=student`), and copy `public/`
   aside. Build the instructor flavour twice and diff the copies to prove the
   build is deterministic.
2. Delete `resources/syllabus.pdf` from each snapshot; its footer carries a
   timestamp.
3. Pack this package (`yarn pack`), extract it into the course's
   `node_modules/@allons-y/course-kit`, rebuild, and `diff -rq` against the
   snapshots.

Notes from doing this:

- Production builds only. Development builds embed a random PostCSS
  source-map id and never match.
- A component's WebC scope class (`.wXXXXXXXX`) is a hash of its source, so any
  edit to a component changes it on every page that uses the component. Compare
  with those hashes normalized.
- An override marker must survive minification. A CSS or JS comment is
  stripped in production; use a real rule or statement.
- Edits to files inside `node_modules` do not trigger a watch rebuild. Work
  from a linked directory outside `node_modules` when developing the package.
