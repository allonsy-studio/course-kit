# Design

How the kit's pages are meant to look, why, and how to make a course look like its college.

## What the pages are for

A course site is read by students scanning for one fact (when is the test, what do I read) and by instructors preparing a class. The design serves that scan: it should look credible, and it should never make a reader work to find the date.

- **Look like a syllabus, not an app.** Warm paper, dark ink, serif headings, rules between sections. Color is a signal (a link, today's class, the current page), not decoration.
- **Say what is clickable.** Only links are underlined. A heading is never underlined, and the menu is underlined only on hover; the current page in the top menu is a filled pill.
- **Keep lines readable.** Running text stops at about 80 characters a line (`--measure`). Tables, schedules and figures use the full column.
- **Put the answer first.** Dates, readings and deadlines sit beside the thing they belong to, in a smaller muted type, so they scan as data and not as prose.
- **Work everywhere.** Light and dark, a phone and a projector, and print. The default palette meets WCAG 2.2 AAA: every text color is 7:1 or better on the page, the surface, the code ground and the overlay, in both modes, and a test holds it. The starter palette is checked at 4.5:1 or better.

## Type

Headings use a book face every system already has: Charter on Mac, iOS and Linux, Sitka on Windows, and Cambria as the fallback. Nothing is downloaded. Body text and labels stay in Instrument Sans. Slide decks keep their own heavy sans for the projector.

The scale is one step of 1.25 per size from 16px, and the scale itself never goes below 14px.

## A section

An `h2` opens a section with a hairline and a short accent bar. An `h3` is a plain serif heading. Small labels (`READ BEFORE CLASS`, table headers) are small uppercase sans with a little letter spacing.

## Tables

Tables read like a printed table: a heavy rule above and below, a light rule under the header and between rows, no boxes, and tabular figures so numbers line up. A component that needs something different styles itself.

## A collegiate palette

The default palette is warm paper and dark ink with two accents. Magenta (`accent`, `#8B1E5E`, a light pink in dark mode) marks what you act on: buttons, links, the check controls. Blue (`accent-secondary`, `#1F4E9C`, a light blue in dark mode) marks where you are: today, the current week, the current page in the menu, the progress track and the edge of a highlighted code line. Links follow the magenta (`link` is `var(--color-accent-text)` by default). The dark theme is a warm espresso black, not a blue-black.

| Role | Token | Used for |
|---|---|---|
| Act | `accent`, `accent-text`, `on-accent` | buttons, links, selected switch options, the "Today's class" card |
| Location | `accent-secondary`, `surface-accent-secondary` | today, the current week, the current page, progress, highlighted code |
| Operable edge | `border-strong` | the edge of anything you can act on (inputs, the switch, tiles, buttons without a fill); `border` stays for hairlines and rules |
| Focus | `focus-ring` | one solid 2px ring everywhere (`:focus-visible`); on a brand fill it takes that fill's text color |

In the defaults, on the page, text measures 10.9:1 in light and 17:1 in dark; muted text 7.9:1 and 8.3:1; magenta text and links 8.2:1 and 8.0:1; blue 7.6:1 and 8.1:1. The worst case on any ground (surface, code ground, overlay) is 10.6:1 and 15.0:1 for text, 7.7:1 and 7.3:1 for muted text, 7.9:1 and 7.1:1 for magenta, 7.4:1 and 7.2:1 for blue. Every `on-*` text on its fill is 7:1 or better; `focus-ring` and `border-strong` are 3:1 or better against the page and the surface.

The accent washes are kept faint so text stays at 7:1 on them: `surface-accent` is 7% (light) and 9% (dark) of the accent over the page, `surface-accent-secondary` 5% and 9%, and `highlight-line` 3% and 6%.

To use your college's colors, set the tokens in `_data/theme.json`. The starter shows a restrained navy-and-paper palette:

```json
{
	"page": { "light": "#FBF9F3", "dark": "#181B25" },
	"surface": { "light": "#F2EEE3", "dark": "#242733" },
	"text": { "light": "#1F2A44", "dark": "#F4F1E8" },
	"text-muted": { "light": "#445069", "dark": "#B9C0D0" },
	"border": { "light": "#D8D0BE", "dark": "#464B5D" },
	"accent": { "light": "#1F3A5F", "dark": "#6A8CC2" },
	"accent-text": { "light": "#1F3A5F", "dark": "#A9C1E6" },
	"on-accent": { "light": "#FBF9F3", "dark": "#10151F" },
	"accent-secondary": { "light": "#1F3A5F", "dark": "#6A8CC2" },
	"on-accent-secondary": { "light": "#FBF9F3", "dark": "#10151F" },
	"link": { "light": "#1F3A5F", "dark": "#A9C1E6" }
}
```

Its contrast, measured: text on the page 13.5:1 in light and 15.2:1 in dark; muted text 7.7:1 and 9.4:1; links 10.9:1 and 9.4:1; the label on an accent button 10.9:1 and 5.4:1.

When you choose your own, keep these rules:

- `accent-text` and `link` are for small text, so each must be dark enough on `page` (light) and light enough (dark). `accent` is for fills and rules; `on-accent` is the text on it. `link` follows `accent-text` by default; set it only to make links a different color.
- `accent-secondary` is the wayfinding color. Set it to your accent if you want one color, as the starter does.
- Check every pair at 7:1 for text (4.5:1 only for large text) and 3:1 for lines and fills. [Color tokens](tokens.md) lists every token and what it colors.
- Keep the second accent for wayfinding. Any other color earns its place only when it carries meaning, such as a test or a deadline.

## Code samples

A fenced code block renders as a figure: a bar in the language's color inside the top border (cyan for CSS, yellow for JavaScript, brown for HTML, tan for the shell, neutral for anything else), a title bar with the language and, given `title="path/file.ext"` on the fence, the file name, then the lines. Multi-line samples get line numbers from CSS, so copying never takes them. Lines highlighted with the fence's `/2-3` range get a faint wash and a 3px blue edge; the edge carries the signal. A copy button appears when JavaScript runs; a terminal session copies only its `$ ` commands. Fences inside a slide stay plain.

## Print

The home page prints to the syllabus PDF on white, in black and white, in one dense page, whatever the screen palette. Set `printStylesheet: /styles/print.css` in the home page's front matter to get it.
