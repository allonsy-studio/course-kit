# @allons-y/course-kit

The shared tooling behind the Meredith College course sites: layouts, WebC
components, styles, client scripts, fonts and the helpers that wire them into
an Eleventy site, and the build configuration that ties them together.

**Status:** extraction in progress. The package is being lifted out of
`instructor-cs230-curriculum` and `instructor-cs180-curriculum` in stages; see
the pull requests for what has landed. Nothing here is published yet.

## Using it

A course's `eleventy.config.js` is one call and a few course-specific lines:

```js
import courseKit from "@allons-y/course-kit";

export default async function (config) {
	courseKit(config, { demos: { runtime: "codepen" } });

	config.ignores.add("content/lessons/taught-log.md");
}
```

Call it, do not `addPlugin` it: Eleventy does not let a plugin set the input,
output, includes, layouts or data directories, and this sets all of them.

| Option | Default | |
|---|---|---|
| `inputDir` / `outputDir` | `content` / `public` | |
| `dataDir` | `_data` | the course's authored data files |
| `institution` | `{}` | `{ name, timezone }`. The name feeds the site metadata; the time zone is what "today" is judged in (default: the build machine's) |
| `site` | derived | `{ description, keywords, language }` |
| `lessons` | built-in | `{ segments, defaultDays }`: the lesson outline, and the meeting days used when the schedule names none |
| `demos.runtime` | `none` | `codepen` ignores the demo fragments; `pyscript` keeps `py-editor` blocks intact through minification, copies the `.py` files (not `_answer.py`) and self-hosts PyScript and Pyodide from the course's own `@pyscript/core` and `pyodide` |
| `slides.decks` | `<inputDir>/slides` | where the fit check looks for decks |
| `pdf` | read from `_data` | `{ course, term, dataDir }` for the syllabus PDF footer |
| `components` | none | extra WebC component globs |
| `prism` | Coldark light and dark | vendored Prism theme and plugin files to publish |
| `theme` | `{}` | color overrides in the shape of `_data/theme.json`, which wins over them |

Subpath exports for the data files a course keeps: `/filters` (date and
schedule filters), `/theme` (the token table and renderer), `/markdown` (the markdown instance, `deckNotes`,
`SLIDE_LINE_BUDGET`), `/worksheets` (`parseWorksheet`, `prepareWorksheet`) and
`/postcss` (the PostCSS configuration).

## Data

The package supplies these globals from `_data/course.json`, `dates.json`,
`schedule.json` and `project.json`: `term`, `lessons`, `site`, `glossary`,
`audience`, `pdf` and `fontFaces`. A `_data` file or folder of the same name
replaces one. Eleventy ranks config global data above `_data` files, so the
package skips its own when it finds yours. Replace `term` and `lessons`
together, since `lessons` is built from the package's term.

- `lessons` places each project milestone on the last meeting on or before it
  (`project.components` or the rubric criteria that carry a `due` date), after
  the meeting's own `due[]`, and carries a week's per-meeting `readings`.
- `glossary` is every `vocab` and `api` slide in `slides.decks` as one term,
  tagged by test, reading and meeting; a `::: tags` block on a slide overrides
  them. It is `null` without a deck folder. The `<glossary>` component renders
  it, with `scripts/glossary.js`.
- `site.timezone` is `institution.timezone`; `<html data-timezone>` carries it so
  `<today-marker>` judges "today" on campus.

`@allons-y/course-kit/data` exports the factories (`resolveTerm`, `buildLessons`,
`buildGlossary`, `projectMilestones`, `resolveSite`, `resolveAudience`,
`resolvePdf`, `readCourseData`) for a course that wants to build on them. A worksheet's `.11tydata.js` is one line:
`export default worksheetData(import.meta.url);`

## Theme

Every color comes from a role token: `--color-page`, `--color-text`, `--color-accent`, and so on. There are no hue or brand names in the CSS. The full list, with each token's role and defaults, is in `docs/tokens.md`.

A course overrides any token in `_data/theme.json`. The key is the token name without `--color-`; a value is one color or a `{ "light", "dark" }` pair. Top-level keys apply to the site and the slide decks; `site` and `deck` hold overrides for one only. The schema in `schemas/theme.schema.json` gives editors completion and checks, and the build fails in plain language on a bad value.

`base.css` and `deck.css` each carry one marker, `/* tokens:site */` and `/* tokens:deck */`; the CSS step writes the declarations there before PostCSS, so the standalone sheet and the copies a deck or worksheet inlines match. `theme.json` is read on every stylesheet build, so a saved change shows under `--watch`.

In development, a theme panel docked on the right edge of every page edits these colors with a live preview and saves `theme.json` through the dev server. Production builds leave it out. See `docs/theme-panel.md`.

## What is in it

| Path | What |
|---|---|
| `layouts/` | The page layouts (`base`, `document`, `lesson`, `lesson-detail`, `deck`, `notes`, `worksheet`, `demo`). Not overridable per file; a difference between courses is a data guard in the layout. |
| `components/` | WebC components, including the home-page set (`course-summary`, `instructor`, `syllabus`, `masthead`, `nav-links`). |
| `schemas/` | `theme.schema.json` for `_data/theme.json`. |
| `assets/` | `styles/`, `scripts/` and `fonts/`, published at `/styles`, `/js` and `/fonts`. The `today-marker` component flags today's meeting and styles it. |
| `glue/` | Pagination and permalink pages with no course prose (`lesson-day`). |
| `docs/` | Notes on the build: `internals.md`, `testing.md`, `slides.md` (slide kinds and copy rules), `tokens.md`, `theme-panel.md`. |
| `lib/` | The build configuration (`plugin.js`), filters, the markdown dialect, the worksheet parser, bundling, the PDF and slide-fit hooks, and the helpers below. |

## Helpers

```js
import { componentFiles, assetPath, registerAssets, registerGlue } from "@allons-y/course-kit";
```

- `componentFiles(localDir)`: the list for the WebC plugin's `components`
  option. A component the course defines wins by file name, because WebC
  throws on a duplicate name.
- `assetPath(rel, inputDir)`: resolve an asset, course copy first, then the
  package's. The one way to read a package asset.
- `registerAssets(config, { inputDir, exclude })`: publish the package's
  styles and scripts as virtual templates and its fonts as passthrough copies,
  skipping anything the course has its own copy of.
- `registerGlue(config, { inputDir, pages })`: register glue pages as virtual
  templates, skipping any page the course defines. Glue pages that should stay
  out of the student build carry `instructorOnly: true`, because path-based
  ignores do not apply to virtual templates.

See `docs/testing.md` for how a change is verified and `docs/internals.md` for the constraints the code works around.

License: MPL-2.0
