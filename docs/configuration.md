# Configuration

Everything you can change about how the kit builds your site: the options in `eleventy.config.js`, the environment variables, and how to replace a piece of the kit with your own.

## `eleventy.config.js`

Your course has one config file, and it can be this short:

```js
import courseKit from "@allons-y/course-kit";

export default async function (config) {
	courseKit(config, {
		institution: { name: "Example College", timezone: "America/New_York" },
	});
}
```

Call `courseKit(...)` as shown. Do not pass it to `config.addPlugin(...)`: Eleventy does not let a plugin choose the folders, and the kit does.

A misspelled option stops the build and names the one you meant, so a typo is never silently ignored.

### Options

Every option is optional.

| Option | Default | What it does |
|---|---|---|
| `institution.name` | none | The college's name, shown in the header, the footer and the page metadata. |
| `institution.timezone` | the build computer's | The time zone "today" is judged in, such as `America/New_York`. Set it so the schedule marks the right day for your campus whatever time zone a student is in. |
| `institution.lms` | `Brightspace` | The name of your learning management system, used in the syllabus and lesson plans. |
| `site` | derived from your course | `{ description, keywords, language }` for the page metadata. |
| `lessons` | built in | `{ segments, defaultDays }`: how a class meeting's time is divided in the lesson plan, and the meeting days used when `schedule.json` names none. |
| `pdf` | on in production builds | `false` skips the syllabus PDF. Without it, a production build needs the `puppeteer` package installed. |
| `demos.runtime` | `none` | How runnable demos are served: `codepen` or `pyscript`. `pyscript` needs `@pyscript/core` and `pyodide` installed in your course. |
| `slides.decks` | `content/slides` | Where your slide decks are, if not the default. |
| `components` | none | Extra component file patterns, beyond your `_includes` folder. |
| `theme` | `{}` | Color overrides, in the shape of `_data/theme.json`, which wins over them. See [color tokens](tokens.md). |
| `inputDir`, `outputDir`, `dataDir` | `content`, `public`, `_data` | Where your pages, the built site and your data files live. |
| `prism` | Coldark light and dark | Which code-highlighting theme and plugins to publish. |

## Building

| Command | What it does |
|---|---|
| `npx eleventy --serve` | Builds the site and serves it, rebuilding as you save. |
| `npx eleventy` | Builds the site into `public/`. |
| `ELEVENTY_ENV=production npx eleventy` | The build you publish: smaller files, the student audience, and the syllabus PDF. |

Set an environment variable by putting it before the command, or in a `.env` file in your course folder.

| Variable | Effect |
|---|---|
| `ELEVENTY_ENV` | `production` makes the publishing build. Anything else is a development build. |
| `AUDIENCE` | `student` or `instructor`. See below. |
| `BUILD_PDF` | `1` writes the syllabus PDF in a development build too. |
| `CHECK_FIT` | `1` warns about slides whose content overflows the slide; `strict` fails the build. Needs `puppeteer`. |
| `URL`, `CONTEXT` | Set by Netlify; the site's public address comes from them. |
| `GITHUB_REPOSITORY` | Set by GitHub Actions; the GitHub Pages address comes from it. |

### Instructor and student builds

The kit builds your site in two flavors from the same files.

- The **instructor** build is the default while you work. It includes lesson plans, speaker notes and anything marked `instructorOnly: true` or `draft: true`.
- The **student** build is the default for `ELEVENTY_ENV=production`. It leaves those out, so what you publish never exposes them.

Force one with `AUDIENCE=student` or `AUDIENCE=instructor`. To keep a page out of the student build, put `instructorOnly: true` at the top of it. To keep a page out until it is ready, use `draft: true`.

## Replacing a piece of the kit

Your files win over the kit's, by name. You replace a whole file; there is no partial override.

| To change | Put your copy in | Notes |
|---|---|---|
| A component | `_includes/<name>.webc` | Copy the kit's file from `components/` and edit it. |
| A style, script or font | `content/styles/`, `content/scripts/` or `content/fonts/`, with the same file name | For colors, use `theme.json` instead; you rarely need to replace a stylesheet. |
| A generated page (`lesson-day`, `deck-notes`, `lesson-plans`) | `content/lessons/<name>.webc` | Your page is used instead of the kit's. |
| A layout | not possible | Layouts are not replaceable one at a time. If you need a different frame, ask for an option. |
| A data global | `_data/<name>.js` or `.json` | See below. |

### Data the kit provides

The kit builds these from your data files and gives them to every page and component: `term`, `lessons`, `site`, `glossary`, `audience`, `pdf` and `fontFaces`. Writing a file with the same name in `_data/` replaces it. If you replace `term`, replace `lessons` too, since `lessons` is built from `term`.

- `term` is your term's label and calendar, from `course.json` and `dates.json`.
- `lessons` is one entry per class meeting. Project milestones land on the last meeting on or before their date.
- `glossary` is every `vocab` and `api` slide in your decks as one term, tagged by test, reading and meeting. A `::: tags` block on a slide overrides the tags. It is empty if you have no slides.
- `site.timezone` is `institution.timezone`; the page carries it so the today marker uses your campus's date.

## For developers

The package's other exports:

```js
import { componentFiles, assetPath, registerAssets, registerGlue } from "@allons-y/course-kit";
```

- `componentFiles(localDir)`: the list for the WebC plugin's `components` option. A component you define wins by file name, because WebC throws on a duplicate name.
- `assetPath(rel, inputDir)`: a path to an asset, your copy first, then the kit's.
- `registerAssets(config, { inputDir, exclude })`: publish the kit's styles and scripts as virtual templates and its fonts as passthrough copies, skipping anything you have your own copy of.
- `registerGlue(config, { inputDir, pages })`: register generated pages as virtual templates, skipping any page you define. Pages that must stay out of the student build carry `instructorOnly: true`, because path-based ignores do not apply to virtual templates.

Subpath exports, for the code in your own data files: `/filters` (date and schedule filters), `/theme` (the token table and renderer), `/markdown` (the markdown instance, `deckNotes`, `SLIDE_LINE_BUDGET`), `/worksheets` (`parseWorksheet`, `prepareWorksheet`, `worksheetData`), `/postcss` (the PostCSS configuration) and `/data` (the factories behind the globals: `resolveTerm`, `buildLessons`, `buildGlossary`, `projectMilestones`, `resolveSite`, `resolveAudience`, `resolvePdf`, `readCourseData`).
