# Components

WebC components in `components/`, in three folders. Component names are global, so a folder is for people: a course overrides a component by file name, whatever folder the package keeps it in.

| Folder | Rule |
|---|---|
| `ui/` | Props and slots only. Never reads `$data`. Reusable on any page. |
| `practice/` | The worksheet's question widgets. They read the prepared `q` and `$data.worksheet.copy`. A worksheet's answers are graded, saved and restored in the browser by `practice.js`. |
| `site/` | Sections of a course site. They read `site`, `term`, `course`, `lessons` and the other globals. |

Every component also needs an example in the [preview](preview.md): `preview/stories/<folder>/<name>.stories.js`.

**Two ways to give a list.** `assigned-list`, `link-list`, `card-list` (its `cards` slot) and `nav-links` take their data as a prop, or the same list as a `<ul>` or `<dl>` in a slot. The prop wins when it has items; when it is missing or empty the slot is rendered, so the list shows if the data does not load. See the [backlog](backlog.md) for the components that do not yet.

**Contributor rules.** A new or changed component meets WCAG 2.2 AAA and ships with what the [definition of done](accessibility.md#definition-of-done-for-a-component) lists: copy keys, roles and states, focus order, forced-colors and reduced-motion rules, 44px targets, a story for every variant, and a test. Two rules are easy to miss: **every variant is demoed** (each `options` value, each boolean on and off, a long title, a missing optional field), and **a prop that takes a list or an object also accepts semantic markup** in the default slot (`<dl>`, `<ul>`, `<table>`) that reads well with no styles or script. A prop with a camelCase name is written kebab-case in an attribute (`dueOn` is `@due-on`), because HTML lowercases attribute names and `@dueOn` would arrive as `dueon`. A boolean prop is set by a bare `@name`, which WebC passes as an empty string, so test it as "present and not `false`", never as truthy.

`yarn test` holds the rules: every component opens with a JSDoc header in a `<script webc:setup>` (the props and slots it takes), `ui/` does not read `$data`, a component's CSS has no color literals, and nothing sits outside the three folders.

## Building blocks

Pages compose these instead of repeating their markup.

| Component | What it is |
|---|---|
| `<arrow-link href>` | A link with a trailing arrow. The label is the slot. |
| `<week-block number label dates level>` | A bordered week with a tinted header band. The slot is its body. |
| `<meeting-card :meeting>` | One meeting row: the date beside the slot. Slot `when` adds lines under the date. |
| `<meeting-decks :meeting slidesLabel addendumLabel>` | A meeting's Slides and Addendum links. |
| `<assigned-list label items dueOn chips kinds>` | A labelled list of readings or deadlines with their due labels; with `chips`, a `.due-chip` for each item's `kind`. |
| `<link-section title items empty>` | A heading and a list of links, each with an optional note. |
| `<today-marker>` / `<today-link label>` | Flag today's meeting, and the button that jumps to it. |

`<schedule-weeks>`, `<demo-weeks>`, `<slide-timetable>` and `<schedule-overview>` build their data from the page (`lessons`, `schedule`, `collections.deck`, `demos`) when called with no props, so a page is one tag: `<schedule-weeks></schedule-weeks>`. Pass `:@weeks`, `:@timetable` or `:@groups` to override.

### Marking today

A component that lists meetings renders `<today-marker>` once, puts `data-today-host="meetings"` (a list) or `"timetable"` (a grid) on its root, and puts `data-date` on what it lists. `data-today-scope` marks the element that carries the highlight when it is not the dated element itself. The script reads the campus date from `<html data-timezone>`.

### Wording

`ui/` components take their strings as props (`label`, `slidesLabel`, a `copy` table) and a `site/` component passes them from `$data.copy`. Every other string is a copy key: see [Changing the wording](configuration.md#changing-the-wording). Components and scripts hold no student-facing English.

**Scripts.** `assets/scripts/` holds behavior that is not tied to one component, named for what it does (`copy.js`, `email.js`, `deck.js`). A script that serves one component lives in that component's `.webc`, in a `<script>` tag: WebC hoists it into the page's `js` bundle once however often the component appears, so it wraps its code in a function and keeps no top-level names (bundled scripts share one module scope).

### The home band and the schedule

`<course-now>` is the home page's opening band: the next class (labelled "Today's class", "Next class" or, before the term, "First class"), what is due soon with a chip for each item's kind, and one bar per week. It builds its weeks from the page (`:@weeks` and `scheduleUrl` are optional), carries its data as JSON in the page, and stays hidden until its script has judged "today" in the campus zone. The deadlines come from the `courseDeadlines` filter: every dated item of a meeting, every dated reading, every `Test n` meeting and the final exam.

`<schedule-weeks>` renders every week as `section.week`, one `li.meeting` per class, a "This week" card, a key to the chips above the first week and one "Hide past weeks" button (`aria-pressed` carries the state; it is not saved). Chips are `.due-chip[data-kind]` (`test`, `graded`, `reading`, `practice`), styled once in the base stylesheet.

### The switch

`.switch` is one pill track of two to four options, styled in the base stylesheet. Group by is a `fieldset.switch[data-switch="radio"]` of native radios; Review / Flashcards is a `div.switch[data-switch="tabs"]` with a roving tabindex. The selected option is `:has(:checked)` or `[aria-selected="true"]`.

### Navigation

The top menu is Home, Syllabus, then every page with an `eleventyNavigation` that has not set `menu: false`, in `order`: Schedule 3, Slides 4, Practice 5, Glossary 6, Projects 7, Demos 8. The footer lists every page, `menu: false` ones and the instructor's Lesson Plans (9) included. `<practice-index>` lists `collections.practice` for the Practice page.

## The lesson page

`glue/lesson-day.data.js` computes `lessonDecks` and `lessonMaterials` with `eleventyComputed`, so `lesson-detail` loops over ready sections and calls no filters. The shaping is in `lib/lesson-materials.js`, which has unit tests.

## The glossary

`glossary` is the page. `glossary-panel` wraps the static list and carries the stylesheet, which also styles what the script builds. `glossary-entry` is one term. The script at the foot of `glossary-panel.webc` defines `<glossary-app>`, which mounts on its own element. The tag hues are the `tag-test`, `tag-reading` and `tag-meeting` theme tokens; each kind's tints derive from its hue.
