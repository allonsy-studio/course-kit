# @allons-y/course-kit

The shared tooling behind the Meredith College course sites: layouts, WebC
components, styles, client scripts, fonts and the helpers that wire them into
an Eleventy site.

**Status:** extraction in progress. The package is being lifted out of
`instructor-cs230-curriculum` and `instructor-cs180-curriculum` in stages; see
the pull requests for what has landed. Nothing here is published yet.

## What is in it

| Path | What |
|---|---|
| `layouts/` | The page layouts (`base`, `document`, `lesson`, `lesson-detail`, `deck`, `notes`, `worksheet`, `demo`). Not overridable per file; a difference between courses is a data guard in the layout. |
| `components/` | WebC components, including the home-page set (`course-summary`, `instructor`, `syllabus`, `masthead`, `nav-links`). |
| `assets/` | `styles/`, `scripts/` and `fonts/`, published at `/styles`, `/js` and `/fonts`. |
| `glue/` | Pagination and permalink pages with no course prose (`lesson-day`). |
| `lib/` | The helpers below. |

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
