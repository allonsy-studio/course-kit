# Components

WebC components in `components/`, in three folders. Component names are global, so a folder is for people: a course overrides a component by file name, whatever folder the package keeps it in.

| Folder | Rule |
|---|---|
| `ui/` | Props and slots only. Never reads `$data`. Reusable on any page. |
| `practice/` | The worksheet's question widgets. They read the prepared `q` and `$data.worksheet.copy`. |
| `site/` | Sections of a course site. They read `site`, `term`, `course`, `lessons` and the other globals. |

Every component also needs an example in the [preview](preview.md): `preview/stories/<folder>/<name>.stories.js`.

`yarn test` holds the rules: every component opens with a JSDoc header in a `<script webc:setup>` (the props and slots it takes), `ui/` does not read `$data`, a component's CSS has no color literals, and nothing sits outside the three folders.

## Building blocks

Pages compose these instead of repeating their markup.

| Component | What it is |
|---|---|
| `<arrow-link href>` | A link with a trailing arrow. The label is the slot. |
| `<week-block number dates level>` | A bordered week with a tinted header band. The slot is its body. |
| `<meeting-card :meeting>` | One meeting row: the date beside the slot. Slot `when` adds lines under the date. |
| `<meeting-decks :meeting>` | A meeting's Slides and Addendum links. |
| `<assigned-list label items prefix>` | A labelled list of readings or deadlines with their due labels. |
| `<link-section title items empty>` | A heading and a list of links, each with an optional note. |
| `<today-marker>` / `<today-link>` | Flag today's meeting, and the button that jumps to it. |

`<schedule-weeks>`, `<demo-weeks>`, `<slide-timetable>` and `<schedule-overview>` build their data from the page (`lessons`, `schedule`, `collections.deck`, `demos`) when called with no props, so a page is one tag: `<schedule-weeks></schedule-weeks>`. Pass `:@weeks`, `:@timetable` or `:@groups` to override.

### Marking today

A component that lists meetings renders `<today-marker>` once, puts `data-today-host="meetings"` (a list) or `"timetable"` (a grid) on its root, and puts `data-date` on what it lists. `data-today-scope` marks the element that carries the highlight when it is not the dated element itself. The script reads the campus date from `<html data-timezone>`.

## The lesson page

`glue/lesson-day.data.js` computes `lessonDecks` and `lessonMaterials` with `eleventyComputed`, so `lesson-detail` loops over ready sections and calls no filters. The shaping is in `lib/lesson-materials.js`, which has unit tests.

## The glossary

`glossary` is the page. `glossary-panel` wraps the static list and carries the stylesheet, which also styles what the script builds. `glossary-entry` is one term. `scripts/glossary.js` defines `<glossary-app>`, which mounts on its own element. The tag hues are the `tag-test`, `tag-reading` and `tag-meeting` theme tokens; each kind's tints derive from its hue.
