# @allons-y/course-kit

Build a course website from a few data files and some pages. You write the course (its description, schedule, policies, slides and practice sheets); the kit supplies the design, the layout, the interactive parts and the build.

You get:

- a home page with the course summary, instructor, syllabus, grading and policies
- a schedule, with today's class marked
- slide decks you present from, with speaker notes and a printable notes sheet
- practice worksheets that students check themselves
- a lesson plan for every class meeting, visible only to you
- light and dark themes, a print stylesheet and a syllabus PDF

**Status:** pre-release (`0.1.0-alpha`). It is not on npm yet, so you install it from GitHub.

## Start here

You need [Node.js](https://nodejs.org) 22 or newer, and a terminal.

1. Copy the [`examples/starter`](examples/starter) folder to a new folder for your course.
2. In that folder, add a `package.json`:

   ```json
   {
   	"name": "my-course",
   	"private": true,
   	"type": "module",
   	"scripts": {
   		"start": "eleventy --serve",
   		"build": "eleventy"
   	},
   	"dependencies": {
   		"@11ty/eleventy": "^3.1.0",
   		"@allons-y/course-kit": "github:allonsy-studio/course-kit"
   	}
   }
   ```

3. Run `npm install`, then `npm start`. Open the address it prints. You are looking at the sample course.
4. Edit the files in `_data/` and `content/`, and the page updates as you save.

[Getting started](docs/getting-started.md) walks through every file in the starter and what to change first.

## Guides

| I want to… | Read |
|---|---|
| Set up my first course | [Getting started](docs/getting-started.md) |
| Know what goes in each data file | [Data files](docs/data-files.md) |
| Write pages, slides and practice sheets | [Writing content](docs/writing-content.md) |
| Change the name, time zone, or what the build does | [Configuration](docs/configuration.md) |
| Make the site look like my college | [Design](docs/design.md), [color tokens](docs/tokens.md) and the [theme panel](docs/theme-panel.md) |
| Look up a component | [Component reference](docs/components-reference.md) |
| See every component rendered | [Component preview](docs/preview.md) (`yarn preview`) |
| Make a test, its key and a practice worksheet | [Test generator skill](skills/test-generator/SKILL.md) |
| Fix an error message | [Troubleshooting](docs/troubleshooting.md) |

## Words used here

- **Data file**: a `.json` file in `_data/` that describes your course. The kit reads them; you rarely write code.
- **Component**: a custom tag, such as `<schedule-weeks>`, that you drop into a page. Components only work in `.webc` pages, not in Markdown.
- **Layout**: the frame around a page (header, footer, styles). Set it with `layout:` at the top of a page.
- **Deck**: a slide presentation, written in Markdown.
- **Instructor build and student build**: the instructor build includes lesson plans and speaker notes; the student build leaves them out. See [Configuration](docs/configuration.md#instructor-and-student-builds).

## For people working on the kit

```sh
yarn install
yarn test      # unit tests, plus a real build of examples/starter
yarn docs      # rewrite docs/components-reference.md from the component headers
yarn schema    # rewrite the theme schema and docs/tokens.md from lib/theme.js
yarn preview   # every component rendered, with scheme, width and accessibility controls
```

How the code is organized, and the quirks it works around, is in [`docs/components.md`](docs/components.md) and [`docs/internals.md`](docs/internals.md). [`docs/testing.md`](docs/testing.md) says how to check a change against a real course.

| Path | What |
|---|---|
| `lib/` | The build configuration (`plugin.js`), data, filters, the markdown dialect, the worksheet parser, bundling, the PDF and slide-fit hooks. |
| `components/` | The tags you use in pages, in `ui/`, `site/` and `practice/`. |
| `layouts/` | The page frames. Not replaceable one at a time. |
| `glue/` | Pages the kit makes for you: lesson plans, the lesson index, speaker notes. A page of yours at the same path replaces one. |
| `assets/` | Styles, scripts and fonts, published at `/styles`, `/js` and `/fonts`. A file of yours with the same name replaces one. |
| `schemas/` | JSON Schemas for the data files, for editor help and checks. |
| `examples/starter/` | The sample course. A test builds it. |
