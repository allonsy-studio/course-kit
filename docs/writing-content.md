# Writing content

The pages of your course live in `content/`. This guide covers how to write each kind: ordinary pages, the home and schedule pages, slide decks and practice worksheets.

## Pages

A page is a file in `content/`. There are two kinds:

| Kind | Write it in | Use it for |
|---|---|---|
| Markdown (`.md`) | Plain text with `#` headings, lists and links | Prose: a guide, a policy page, a project brief |
| WebC (`.webc`) | HTML, with the kit's [components](components-reference.md) as tags | Pages built from components: the home and schedule pages |

**Components only work in `.webc` files.** In a Markdown file a tag such as `<syllabus>` is left in the page as it is, and shows nothing.

Every page starts with a block between `---` lines, called front matter:

```yaml
---
layout: base
title: Local setup guide
eleventyNavigation:
  key: Setup
  order: 6
---
```

| Key | Meaning |
|---|---|
| `layout` | The frame around the page. See below. |
| `title` | The page's title, shown in the browser tab. |
| `eleventyNavigation` | Puts the page in the site menu. `key` is its name; `order` sorts the menu (lower is first). Leave it out to keep the page out of the menu. |
| `instructorOnly: true` | The page is left out of the student build. |
| `draft: true` | The page is left out of the student build until you remove this. |
| `indexed: false` | Asks search engines to skip the page. |

Two pages should not share an `order`, or their menu order is not predictable.

### Layouts

| `layout:` | For |
|---|---|
| `base` | An ordinary page: header, footer, your content in between. Use this by default. |
| `document` | Markdown prose, set in a comfortable reading column. |
| `deck` | A slide deck. Set for the whole slides folder; see below. |
| `worksheet` | A practice worksheet. Set for you by the worksheet's data file. |
| `demo` | A runnable demo page. |

The kit makes three more pages for you, for the instructor build only: a lesson plan for every class meeting (`/lessons/week-1/day-1/`), the list of them (`/lessons/`), and a speaker-notes sheet for every deck (`/lessons/week-1/day-1/notes/`).

## The home page

The sample home page is three tags:

```html
---
layout: base
printStylesheet: /styles/print.css
eleventyNavigation:
  key: Home
  order: 1
---

<course-summary></course-summary>
<policies></policies>
<course-documents></course-documents>
```

`printStylesheet` loads the styles that make this page print as a clean syllabus; a production build prints this page to `resources/syllabus.pdf`, so keep it. `<course-summary>` shows the description, the instructor, the syllabus and the schedule, all from your [data files](data-files.md). `<policies>` lists your policies. `<course-documents>` lists the links in `course.json`'s `documents`. Take out a tag to take out that part. The menu's "Syllabus" link points at the syllabus on this page, so a course needs a page at `/` that includes `<course-summary>`.

## The schedule page

```html
---
layout: base
title: Schedule
eleventyNavigation:
  key: Schedule
  order: 2
---

<article class="content-column wide">
	<schedule-overview></schedule-overview>
	<schedule-weeks></schedule-weeks>
</article>
```

`<schedule-overview>` is the header with key dates and a row of shortcuts, including one to today's class. `<schedule-weeks>` is every week. Both build themselves from `schedule.json` and your decks.

## Slide decks

### Set up the folder

Put decks in `content/slides/`. The folder needs a small file, `index.11tydata.js`, that tells Eleventy every file in it is a deck:

```js
export default {
	layout: "deck",
	tags: ["deck"],
	indexed: true,
};
```

and an `index.webc` page, using `layout: base`, for the list of decks:

```html
---
layout: base
title: Slides
eleventyNavigation:
  key: Slides
  order: 3
---

<article class="content-column wide">
	<h1>Slides</h1>
	<slide-timetable></slide-timetable>
</article>
```

Copy both from [`examples/starter/content/slides`](../examples/starter/content/slides).

### Write a deck

A deck is a Markdown file. Its front matter says which meeting it is for:

```yaml
---
title: Why the web doesn't break
week: 1
day: 2
---
```

`week` and `day` are required: they link the deck to the schedule, the lesson plan and its notes sheet. Day 1 is the week's first meeting. To add a second deck to a meeting, give it `addendum: true`.

Each slide opens with `>>> slide` and closes with a line holding only `>>>`:

```markdown
>>> slide title
::: eyebrow
- Example College
- Fall 2026
:::

# CS 101

> Tuesday, August 25

::: notes Welcome (0:00–0:05)
- Say hello. Put your email on the board.
:::

>>>
```

- `>>> slide` is an ordinary slide. Add a kind after it for a special look: `title`, `section`, `checkpoint`, `vocab` or `api`. An unknown kind stops the build and lists the ones that exist.
- `::: name` … `:::` is a block. `eyebrow` is the small line above a heading. `notes` is for you: the text after it is the label, with the minutes in parentheses. Notes appear in the deck's speaker view and on its notes sheet, and never on the slide. Any other lowercase name, such as `example` or `cols-2`, becomes a styled block of that name.
- A slide that holds too much fails a rough size check. Set `CHECK_FIT=1` when you build to measure it properly (see [Configuration](configuration.md#building)); the fix is to split the slide, not to shrink the text.

[Slide kinds and copy rules](slides.md) describes the `vocab` and `api` slides and the writing conventions the courses follow. Every `vocab` and `api` slide also becomes an entry in the course glossary.

## Practice worksheets

A practice worksheet is a page of questions that students check themselves, with a link from each answer back to the slide that taught it. It takes three files in one folder, say `content/practice/`:

1. `test-1.worksheet.md`: the questions, written in Markdown.
2. `test-1.11tydata.js`: one line of code that reads the questions.
3. `test-1.webc`: the page, one tag.

```js
// test-1.11tydata.js
import { worksheetData } from "@allons-y/course-kit/worksheets";

export default worksheetData(import.meta.url);
```

```html
<!-- test-1.webc -->
---
date: Last Modified
---

<practice-worksheet></practice-worksheet>
```

The worksheet's heading, the intro and the questions all live in `test-1.worksheet.md`: its front matter holds the title and wording, and the body holds the intro, a list of terms, and the questions. A question can be multiple choice, matching, fill in the blank, a diagram to label, a tree to complete, a code line to judge, or a self-check. The kit checks the worksheet when it builds, and a mistake is reported with the file and line.

## Prompts and filtered glossary links

A fenced block labeled `prompt` renders as a figure of ordinary text with a Copy button, for text students paste into a tool. Label a block `prompt-avoid` for an example of what not to paste: it looks the same and has no Copy button.

The glossary page can open already filtered. Add to its address any of `?mode=study` (flashcards), `group=test` (or `reading`, `meeting`), `test=1,2`, `reading=…`, `meeting=…` and `q=search words`; the page keeps the address in step as a reader changes the controls, so they can share it.

## Resources, images and fonts

- Handouts and starter files go in `content/resources/` and are published at `/resources/`.
- Images go in `content/assets/images/`, published at `/images/`.
- A favicon goes in `content/assets/`.
- Fonts the kit already carries need nothing; your own go in `content/fonts/`.
