# Color tokens

Generated from `lib/theme.js` by `yarn schema`. Do not edit by hand.

Every color in the site and the slide decks comes from one of these. Override any of them in the course's `_data/theme.json`; the key is the token name without `--color-`. A value is one color, or `{ "light": color, "dark": color }`.

| Key | CSS | Role | Site default | Deck default |
|---|---|---|---|---|
| `page` | `--color-page` | Page background | `#FBF9F3` / `#1C1613` | `#FBF9F3` / `#1C1613` |
| `surface` | `--color-surface` | Raised or alternate surface: cards, table headers, code | `#F8F6F0` / `#2A211C` | `#fff` / `#2A211C` |
| `surface-subtle` | `--color-surface-subtle` | Faint surface tint | `color-mix(in oklab, #414C75 3%, transparent)` / `hsl(22deg 20% 20% / 30%)` |  |
| `surface-overlay` | `--color-surface-overlay` | Popovers and menus | `#FBF9F3` / `#3A2E27` |  |
| `surface-accent` | `--color-surface-accent` | Accent-tinted wash | `color-mix(in oklab, var(--color-accent) 14%, transparent)` / `color-mix(in oklab, var(--color-accent) 20%, transparent)` | `color-mix(in oklab, var(--color-accent-strong) 14%, light-dark(white, black))` |
| `table-header` | `--color-table-header` | Table header cells | `var(--color-surface)` |  |
| `surface-warning` | `--color-surface-warning` | Warning panel background |  | `#fff2e6` / `#3a2314` |
| `text` | `--color-text` | Body text | `#33394E` / `#FBF9F3` | `#33394E` / `#FBF9F3` |
| `text-muted` | `--color-text-muted` | Secondary text | `#414C75` / `#B6AFAB` | `#414C75` / `#B6AFAB` |
| `border` | `--color-border` | Lines, rules and borders | `#B6AFAB` / `#5A4A40` | `#EFEBDF` / `#3A2E27` |
| `border-accent` | `--color-border-accent` | Accent-tinted line |  | `color-mix(in oklab, var(--color-accent-strong) 40%, light-dark(white, black))` |
| `accent` | `--color-accent` | Brand color: fills, buttons, rules, the masthead wash | `#8B1E5E` / `#E573AD` | `#8B1E5E` / `#E573AD` |
| `accent-text` | `--color-accent-text` | Brand color for type, dark enough to read | `#8B1E5E` / `#E573AD` | `#8B1E5E` / `#E573AD` |
| `accent-strong` | `--color-accent-strong` | Brand color for decorative marks: the text tone in light mode, the fill in dark |  | `light-dark(var(--color-accent-text), var(--color-accent))` |
| `on-accent` | `--color-on-accent` | Text on a brand-color fill | `#FBF9F3` / `#1C1613` |  |
| `accent-hover` | `--color-accent-hover` | Brand fill, hovered | `color-mix(in oklch, var(--color-accent) 40%, transparent)` |  |
| `accent-active` | `--color-accent-active` | Brand fill, pressed | `color-mix(in oklch, var(--color-accent) 40%, transparent)` |  |
| `accent-secondary` | `--color-accent-secondary` | Wayfinding color: progress, section bars, the current location, highlighted code | `#1F4E9C` / `#82AEF5` | `#1F4E9C` / `#82AEF5` |
| `on-accent-secondary` | `--color-on-accent-secondary` | Text on a wayfinding-color fill | `#FBF9F3` / `#1C1613` |  |
| `link` | `--color-link` | Links | `#8A4A12` / `#E9A35C` |  |
| `link-hover` | `--color-link-hover` | Links, hovered | `color-mix(in oklch, var(--color-link) 90%, var(--color-text))` |  |
| `link-focus` | `--color-link-focus` | Links, focused | `color-mix(in oklch, var(--color-link) 90%, var(--color-text))` |  |
| `link-active` | `--color-link-active` | Links, pressed | `color-mix(in oklch, var(--color-link) 90%, var(--color-text))` |  |
| `success` | `--color-success` | Success: correct answers, confirmations | `#1F6B4B` / `#53C696` | `#1c6135` / `#7fd8a0` |
| `on-success` | `--color-on-success` | Text on a success fill | `#FBF9F3` / `#1C1613` |  |
| `error` | `--color-error` | Error: wrong answers, failures | `#BD2828` / `#E05252` | `#a3261a` / `#ff9d8f` |
| `on-error` | `--color-on-error` | Text on an error fill | `#FBF9F3` / `#1C1613` |  |
| `warning` | `--color-warning` | Warnings and cautions | `#EDA412` / `#CC8F00` | `#8a3500` / `#ffb37a` |
| `on-warning` | `--color-on-warning` | Text on a warning fill | `#33394E` / `#1C1613` |  |
| `highlight` | `--color-highlight` | Highlighted (marked) text | `#FFD36C` / `#FFC233` |  |
| `tag-test` | `--color-tag-test` | Glossary tag hue for tests; its tints derive from it | `#b37019` / `#e7a855` |  |
| `tag-reading` | `--color-tag-reading` | Glossary tag hue for readings; its tints derive from it | `#1938b3` / `#5572e7` |  |
| `tag-meeting` | `--color-tag-meeting` | Glossary tag hue for class meetings; its tints derive from it | `#13863d` / `#55e78b` |  |
| `code` | `--color-code` | Preformatted code text and its border | `var(--color-text)` |  |
| `gradient` | `--color-gradient-1` to `-4`, `--gradient-stops` | Decorative gradient, one to four colors | `#8B1E5E` / `#E573AD`, `#7BD1E6`, `#FFD36C` / `#FFC233`, `#FF9A56` | |

A blank default means that stylesheet does not use the token.

## Scope

- A top-level key applies to the site and the decks.
- `"site": { … }` applies to the site only; `"deck": { … }` to the decks only. Either wins over a top-level key.

```json
{
	"$schema": "../node_modules/@allons-y/course-kit/schemas/theme.schema.json",
	"accent": "#7BD1E6",
	"accent-text": { "light": "hsl(193deg 58% 31%)", "dark": "hsl(192deg 68% 72%)" },
	"site": { "page": { "light": "#FBF9F3", "dark": "hsl(228deg 20% 12%)" } },
	"gradient": ["#7BD1E6", "#FFC233"]
}
```
