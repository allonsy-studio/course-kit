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
| `demos.runtime` | `none` | `codepen` ignores the demo fragments; `pyscript` keeps `py-editor` blocks intact through minification and copies the `.py` files |
| `slides.decks` | `<inputDir>/slides` | where the fit check looks for decks |
| `pdf` | read from `_data` | `{ course, term, dataDir }` for the syllabus PDF footer |
| `components` | none | extra WebC component globs |
| `prism` | Coldark light and dark | vendored Prism theme and plugin files to publish |

Subpath exports for the data files a course keeps: `/filters` (date and
schedule filters), `/markdown` (the markdown instance, `deckNotes`,
`SLIDE_LINE_BUDGET`), `/worksheets` (`parseWorksheet`, `prepareWorksheet`) and
`/postcss` (the PostCSS configuration).

## What is in it

| Path | What |
|---|---|
| `layouts/` | The page layouts (`base`, `document`, `lesson`, `lesson-detail`, `deck`, `notes`, `worksheet`, `demo`). Not overridable per file; a difference between courses is a data guard in the layout. |
| `components/` | WebC components, including the home-page set (`course-summary`, `instructor`, `syllabus`, `masthead`, `nav-links`). |
| `assets/` | `styles/`, `scripts/` and `fonts/`, published at `/styles`, `/js` and `/fonts`. |
| `glue/` | Pagination and permalink pages with no course prose (`lesson-day`). |
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

See `docs/testing.md` for how a change is verified.

License: MPL-2.0
