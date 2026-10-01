# Testing a change

Two layers.

## Unit tests

```sh
npm test
```

Covers the helpers, filters, markdown, worksheet preparation and PostCSS. The plugin as a whole is verified by the golden builds below; there is no fixture site.

## Golden builds against a course

A change is sound when a real course builds byte-identically before and after.

1. Build the course from a clean checkout with `ELEVENTY_ENV=production`, once
   per audience (`AUDIENCE=instructor`, `AUDIENCE=student`), and copy `public/`
   aside. Build the instructor flavour twice and diff the copies to prove the
   build is deterministic.
2. Delete `resources/syllabus.pdf` from each snapshot; its footer carries a
   timestamp.
3. Pack this package (`npm pack`), extract it into the course's
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
