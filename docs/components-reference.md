# Component reference

Generated from the header comment of each file in `components/` by `yarn docs`. Do not edit by hand.

A component is a custom tag you write in a `.webc` page (not in a Markdown file, where the tag is left as it is). Give it a value with `@name="text"`, or with `:@name="expression"` to pass data:

```html
<course-summary></course-summary>
<assigned-list @label="Read before class" :@items="week.readings"></assigned-list>
```

A prop in square brackets is optional. To change a component for your course, copy its file into your own `_includes` folder: your copy replaces the kit's, by file name.

## Building blocks

Take props and slots only; they never read the page's data. Use them anywhere.

### `<arrow-link>`

A link with a trailing arrow. The label is the slot; `href` and any other attribute pass through to the `<a>`.

### `<assigned-list>`

A labelled list of readings or deadlines. Renders nothing when empty. Give it the `items` array, or write the list as a `<dl>` in the default slot: each `<dt>` holds the title or its link (give it `data-kind` and, before the title, `<span class="due-chip" data-kind="test">Test</span>` for a chip), each `<dd>` only the check or due detail. The array wins when it has items; when it is missing or empty the slot is rendered instead, so the list still shows if the data does not load.

| Prop | Type | |
|---|---|---|
| `label` | `string` | the heading above the list |
| `items` | `{ title: string, href?: string, check?: string, dueLabel?: string, kind?: string }[]` | the readings or deadlines to list |
| `[dueOn]` | `string` | how a due date reads after the check, with `{when}`: `copy.schedule.dueOn` ("due {when}"); without it the date stands alone |
| `[chips]` | `boolean` | put a `.due-chip` for the item's `kind` before its title; a bare `@chips` turns them on |
| `[kinds]` | `Record<string, string>` | the chip words by kind, from `copy.schedule.dueKind*`; needed with `chips` |

### `<callout>`

A highlighted aside. The content is the slot. A typed callout opens with its type in words, so the type is never told by color alone.

| Prop | Type | |
|---|---|---|
| `[type]` | `'success' \| 'warn' \| 'error'` | the color of the edge and wash, and the opening word (`copy.callout`: Success, Warning, Error); none, or any other value, is the brand color with no word. Write it `@type="warn"` or as the attribute `:type="'warn'"`: both color it. |
| `[label]` | `string` | the opening word in place of the default for the type; `label=""` (or a bare `@label`) shows none; a callout with no type shows none either way |

### `<card-list>`

A list of cards, each linking to a page. A card shows the page's code, name and description unless the slot supplies its own content. Instead of `items` you can write the cards yourself as a `<ul>` of `<li>` cards in the `cards` slot (the default slot is taken: it is each card's own content); the array wins when it has items, and when it is missing or empty the `cards` slot is rendered instead. A card written in the slot must name its overlay link, as the items form does: `<li><a href="/x/" aria-labelledby="x-name"></a><h3 id="x-name">Name</h3></li>`.

| Prop | Type | |
|---|---|---|
| `items` | `object[]` | pages, each with `data` and `page.url` |

Slots:

- `cards`: the cards as a `<ul>`, used when `items` is missing or empty
- `default`: each card's own content, in place of its code, name and description

### `<codepen-embed>`

A live code sample: a header with actions, then the CodePen embed prefilled with the code.

| Prop | Type | |
|---|---|---|
| `[heading]` | `string` | the header, default `copy.theCode` |
| `label` | `string` | the pen's title |
| `summary` | `string` | the pen's description |
| `[height]` | `number` | embed height in pixels, default 800 |
| `[tags]` | `string[]` | tags added to the pen |
| `copy` | `Record<string, string>` | the pane labels: `copy.codepenEmbed` (`theCode`, `html`, `css`, `javascript`, `htmlSource`, `cssSource`, `javascriptSource`) |

Slots:

- `actions`: buttons beside the header
- `default`: extra content under the code

### `<download-button>`

A download link with an icon. The label is the slot.

| Prop | Type | |
|---|---|---|
| `url` | `string` | the file to download |

### `<eyebrow>`

A small line above a heading. The content is the slot.

### `<link-list>`

A list of links, each with a name and an optional description. Give it the `items` array, or write the list in the default slot as a `<ul>` of links, or as a `<dl>` (`<dt>` the link, `<dd>` the description). The array wins when it has items; when it is missing or empty the slot is rendered instead.

| Prop | Type | |
|---|---|---|
| `items` | `{ url: string, name: string, description?: string }[]` | the links to list |

### `<link-section>`

A titled list of links. Renders nothing when there are no items and no `empty` text.

| Prop | Type | |
|---|---|---|
| `[title]` | `string` | the heading; left out when there are no items |
| `items` | `{ title: string, href?: string, note?: string, extra?: { text: string, href: string, after?: string } }[]` | the links to list; an item with no `href` is plain text |
| `[empty]` | `string` | shown, muted, when there are no items |

### `<meeting-card>`

One class meeting in a week's list: the date down the left, the slot beside it. Marks itself as the scope `<today-marker>` highlights.

| Prop | Type | |
|---|---|---|
| `meeting` | `{ iso: string, weekday: string, date: string }` | one meeting from `scheduleWeeks` |

Slots:

- `when`: extra lines under the date (a note, a link)
- `default`: what the meeting holds; a child sits beside the date

### `<meeting-decks>`

A meeting's deck links, each on its own line: the slides, then any addendum. Renders nothing without either.

| Prop | Type | |
|---|---|---|
| `meeting` | `{ slides?: string, addendum?: string }` | one meeting from `scheduleWeeks` |
| `slidesLabel` | `string` | the slides link's text, `copy.schedule.slides` |
| `addendumLabel` | `string` | the addendum link's text, `copy.schedule.addendum` |

### `<table-rubric>`

A grading rubric as a table: criteria down, performance levels or a due date and points across.

| Prop | Type | |
|---|---|---|
| `criteria` | `object[]` | rubric criteria |
| `[levels]` | `string[]` | level names across the top |
| `[caption]` | `string` | a screen-reader caption |
| `[total]` | `number` | the points the rubric adds up to, shown in the footer |
| `copy` | `Record<string, string>` | the table's wording: `copy.tableRubric` (`criteria`, `points`, `pointsEach`, `totalPointsPossible`, `milestone`, `due`, `whatIsGraded`) |

### `<today-link>`

The page's Today shortcut: a button that jumps to the `#today` element `<today-marker>` picks. Hidden until there is one, and in print.

| Prop | Type | |
|---|---|---|
| `label` | `string` | the link's text, `copy.schedule.today` |

### `<today-marker>`

<today-marker> marks today's class meeting. A host renders it once, adds `data-today-host="<name>"` to its root, and puts `data-date` on what it lists; the page's `<today-link>` jumps to the result. A script flags every [data-date] element listing today's campus date (the site's `institution.timezone`): data-today, aria-current="date" and a visible "Today" flag (data-today-label overrides the text; a table row gets it in its first cell). One element gets id="today" for the link: today's, else the next meeting, else the first (before the term) or last (after it); never a no-class day. A host puts data-today-scope on the element that should carry the id and the highlight (the schedule's .meeting), otherwise the dated element itself does. An element that already has an id gets an empty <span id="today"> inside it instead, and an existing #today wins.

### `<week-block>`

One bordered block per week: a tinted header band, then the slot.

| Prop | Type | |
|---|---|---|
| `number` | `number` | the week number, for the anchor (not `week`: slot content sees a component's props, and a host loops over `week`) |
| `label` | `string` | the heading, "Week 3" (`copy.schedule.weekHeading` filled in) |
| `dates` | `string` | the week's date range, shown beside the heading |
| `[level=3]` | `2 \| 3` | the heading level |

Icons, each an inline SVG that takes its color from the text: `<github>`, `<google>`.

## Site sections

Parts of a course site. Most read the course's data files, so they work with no props.

### `<copyright>`

The copyright line: the build year and the site's author. Reads `site`.

### `<course-documents>`

The "Additional resources" list: the entries of `course.documents`, each a link with an optional description. A PDF is listed only when the build produced PDFs. Renders nothing when there are none.

### `<course-now>`

The home page's opening band: the next class, what is due soon and the week-by-week progress. Hidden until its script has judged "today" in the campus zone. Wording comes from `copy.home` and `copy.schedule`.

| Prop | Type | |
|---|---|---|
| `[weeks]` | `object[]` | `scheduleWeeks` output; built from the page's lessons, schedule, decks and demos when left out |
| `[scheduleUrl]` | `string` | where the schedule lives, default `/schedule/` |

### `<course-summary>`

The course home page's body: the description, the instructor, the syllabus and the schedule. Reads the `course`, `grading`, `schedule`, `instructor` and `term` data; it takes no props.

### `<demo-weeks>`

The weeks that had a demo, one row per meeting: its demos, then its deck.

| Prop | Type | |
|---|---|---|
| `[weeks]` | `object[]` | `demoWeeks` output; built from the page's demos, lessons and decks when left out |

### `<glossary-entry>`

One glossary term as a `<dt>`/`<dd>` pair: the term, its definition, an optional signature, meta line and example, its tags, and where it was taught. Styled by `<glossary-panel>`, which holds the list.

| Prop | Type | |
|---|---|---|
| `entry` | `object` | a term from `buildGlossary` |

### `<glossary-panel>`

The glossary's element: the grouped list it wraps (the slot), which the script at the foot of this file replaces with Review and Flashcards. One stylesheet covers both, since the script renders the same markup the server does.

| Prop | Type | |
|---|---|---|
| `json` | `string` | the terms and tags the script reads, as a JSON string |

Slots:

- `default`: the static, grouped list inside `[data-static]`

### `<glossary>`

The course glossary page: every `vocab` and `api` slide as one tagged term, listed A to Z and enhanced into Review and Flashcards by `<glossary-panel>`. Reads the `glossary` global.

### `<grading>`

The grade-weighting table and the grading scale. Reads the `grading` and `scale` data; it takes no props and renders nothing without `grading`.

### `<instructor>`

The instructor's details: photo, office, contact and hours. Reads `instructor`.

| Prop | Type | |
|---|---|---|
| `[variant]` | `'card'` | a compact card instead of the full section |

### `<masthead>`

The page header: institution, term, course title and the navigation. Reads `site`, `term` and `course`. The menu is Home, Syllabus, then every page of the site menu that has not set `menu: false`.

### `<nav-links>`

The site navigation as a list of links, marking the current page. Give it the `navigation` array, or write the links in the default slot as a `<ul>` of `<li><a>`; the array wins when it has items, and when it is missing or empty the slot is rendered instead.

| Prop | Type | |
|---|---|---|
| `navigation` | `{ url: string, title: string }[]` | pages from `eleventyNavigation` |
| `[context]` | `'footer' \| 'hero'` | adds the instructor's contact link in the footer and the hero |

### `<policies>`

The policies section: one disclosure per entry in `policies.json`, open by default, each with an optional link to the full policy. Renders nothing without `policies`.

### `<practice-index>`

The practice page's table: every practice sheet in `collections.practice`, by its worksheet `order` (then its URL), with what each is for. Says so when there are none. The page's own intro stays page content. Wording comes from `copy.practice`.

### `<schedule-overview>`

The schedule page's header: the meeting line, the key dates, and a row of jump links (Today, then one per month). Props are read in the template, since a setup script cannot see them.

| Prop | Type | |
|---|---|---|
| `[groups]` | `{ title: string, items: object[] }[]` | `scheduleKeyDates` output; built from the page's lessons, project and exam slot when left out |
| `[weeks]` | `object[]` | `scheduleWeeks` output, for the month links; built from the page when left out |

### `<schedule-weeks>`

Every week of the term as a bordered block: one row per class meeting (when, topics, and what that class needs: reading, due items, materials) and a footer for the week's own resources. A "This week" card, the hide-past toggle and the Now and Done flags are added by the script. Deadlines carry a chip for their `kind`; the key above the weeks lists the kinds in use. Wording comes from `copy.schedule`.

| Prop | Type | |
|---|---|---|
| `[weeks]` | `object[]` | `scheduleWeeks` output; built from the page's lessons, schedule, decks and demos when left out |

### `<site-footer>`

The page footer: course, institution, term, copyright and the links. Reads `course`, `site` and `term`.

### `<slide-timetable>`

Every slide deck as a timetable: one row per week, one column per meeting day.

| Prop | Type | |
|---|---|---|
| `[timetable]` | `{ days: string[], weeks: object[] }` | `slideTimetable` output; built from the page's decks, lessons and meeting days when left out |

### `<syllabus>`

The syllabus: outcomes, text, technology, coursework and grading. Reads the `course`, `grading`, `scale`, `schedule` and `project` data; it takes no props.

## Practice worksheets

The widgets a practice worksheet is made of. `<practice-worksheet>` assembles them; you rarely use the others directly.

### `<check-controls>`

The Check and Reset buttons and the score line for one worksheet scope. `practice.js` wires them and fills the tally.

| Prop | Type | |
|---|---|---|
| `scope` | `string` | ties the buttons and tally to a question or section |
| `label` | `string` | the check button's text |
| `reset` | `string` | the reset button's text |
| `confirm` | `string` | the question Reset asks before it clears anything |

### `<choice-list>`

A radio group of lettered choices.

| Prop | Type | |
|---|---|---|
| `choices` | `{ name: string, value: string, text: string, letter?: string }[]` | the options, one radio button each |
| `[legend]` | `string` | the group's legend |
| `[legendclass]` | `string` | class for the legend, such as `sr-only` |

### `<cite-panel>`

A "?" disclosure listing the sources for a question.

| Prop | Type | |
|---|---|---|
| `sources` | `{ title: string, href?: string }[]` | the places to read more, shown as links |
| `group` | `string` | disclosures sharing a group close each other |
| `label` | `string` | the summary's accessible name |
| `[heading]` | `string` | a line above the list |
| `[marker]` | `string` | the summary glyph, default `?` |

### `<practice-figure>`

A question's inline SVG diagram, written out as authored. Its class vocabulary is styled by the worksheet stylesheet.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared question with a `figure` |

### `<practice-fill>`

A fill-in question: a word bank and a numbered list of blanks.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared `fill` question |

### `<practice-grid>`

A grid question: rows of choices across columns.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared `grid` question |

### `<practice-judge>`

A judge question: a verdict, then the one line of code that causes the problem.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared `judge` question |

### `<practice-match>`

A match question: a lettered bank and items that each take a letter.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared `match` question |

### `<practice-question>`

One worksheet question: its prompt, sources, snippet and figure, then the control its kind needs, then the feedback and the reasoning. `practice.js` grades it.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared question; `q.kind` picks the control |

### `<practice-selfcheck>`

A self-check question: reveal the answer, then tick what you got.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared `selfcheck` question |

### `<practice-terms>`

A bank of terms, each opening its definition in a popover.

| Prop | Type | |
|---|---|---|
| `terms` | `{ id: string, term: string, definition: string, source?: object }[]` | the terms, each with its definition |
| `[hint]` | `string` | a line above the bank |
| `[sourceprefix]` | `string` | text before each source link's label |

### `<practice-tree>`

A tree question: a snippet and its DOM tree with blanks to fill in.

| Prop | Type | |
|---|---|---|
| `q` | `object` | a prepared `tree` question |

### `<practice-worksheet>`

The practice worksheet page: heading, results summary, question list, sections of questions and the check controls. Reads the `worksheet` data a worksheet's `.11tydata.js` supplies; `practice.js` grades, saves and restores the answers in this browser. With `checkMode: "question"` (front matter, or `worksheets.checkMode` in the course config) each gradable question also has a Check answer button; the default, `"end"`, checks only from See results at the end.
