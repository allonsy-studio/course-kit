# Design

How the kit's pages are meant to look, why, and how to make a course look like its college.

## What the pages are for

A course site is read by students scanning for one fact (when is the test, what do I read) and by instructors preparing a class. The design serves that scan: it should look credible, and it should never make a reader work to find the date.

- **Look like a syllabus, not an app.** Warm paper, dark ink, serif headings, rules between sections. Color is a signal (a link, today's class, the current page), not decoration.
- **Say what is clickable.** Only links are underlined. A heading is never underlined, and the menu is underlined only for the current page and on hover.
- **Keep lines readable.** Running text stops at about 80 characters a line (`--measure`). Tables, schedules and figures use the full column.
- **Put the answer first.** Dates, readings and deadlines sit beside the thing they belong to, in a smaller muted type, so they scan as data and not as prose.
- **Work everywhere.** Light and dark, a phone and a projector, and print. The default and starter palettes are checked at 4.5:1 or better for every text color.

## Type

Headings use a book face every system already has: Charter on Mac, iOS and Linux, Sitka on Windows, and Cambria as the fallback. Nothing is downloaded. Body text and labels stay in Instrument Sans. Slide decks keep their own heavy sans for the projector.

The scale is one step of 1.25 per size from 16px, and the scale itself never goes below 14px.

## A section

An `h2` opens a section with a hairline and a short accent bar. An `h3` is a plain serif heading. Small labels (`READ BEFORE CLASS`, table headers) are small uppercase sans with a little letter spacing.

## Tables

Tables read like a printed table: a heavy rule above and below, a light rule under the header and between rows, no boxes, and tabular figures so numbers line up. A component that needs something different styles itself.

## A collegiate palette

The default accent is the kit's magenta. To use your college's colors, set the tokens in `_data/theme.json`. The starter shows a restrained navy-and-paper palette:

```json
{
	"page": { "light": "#FBF9F3", "dark": "#181B25" },
	"surface": { "light": "#F2EEE3", "dark": "#242733" },
	"text": { "light": "#1F2A44", "dark": "#F4F1E8" },
	"text-muted": { "light": "#445069", "dark": "#B9C0D0" },
	"border": { "light": "#D8D0BE", "dark": "#464B5D" },
	"accent": { "light": "#1F3A5F", "dark": "#6A8CC2" },
	"accent-text": { "light": "#1F3A5F", "dark": "#A9C1E6" },
	"on-accent": { "light": "#FBF9F3", "dark": "#10151F" }
}
```

Its contrast, measured: text on the page 13.5:1 in light and 15.2:1 in dark; muted text 7.7:1 and 9.4:1; links 10.9:1 and 9.4:1; the label on an accent button 10.9:1 and 5.4:1.

When you choose your own, keep these rules:

- `accent-text` is for links and small text, so it must be dark enough on `page` (light) and light enough (dark). `accent` is for fills and rules; `on-accent` is the text on it.
- Check every pair at 4.5:1 for text and 3:1 for lines and fills. [Color tokens](tokens.md) lists every token and what it colors.
- One accent is enough. A second color earns its place only when it carries meaning, such as a test or a deadline.

## Print

The home page prints to the syllabus PDF on white, in black and white, in one dense page, whatever the screen palette. Set `printStylesheet: /styles/print.css` in the home page's front matter to get it.
