# Theme panel

A color editor that appears on every page while the site runs in development (`yarn start`). It lets an instructor pick colors, see them on the real pages, and save them to `_data/theme.json` without opening a code editor. Production builds leave it out entirely: no script, no element, no endpoint.

## Using it

1. Run `yarn start` and open the site.
2. Select the **Theme** tab on the right edge of the window.
3. Change a color with the swatch or by typing a value. The page updates as you go.
4. Select **Save** to write `_data/theme.json`. The site rebuilds and reloads with the new colors.

The panel opens with the colors most courses change: the brand color, the page and card backgrounds, and the text and link colors. **Every color** lists the rest, plus the gradient used on the home page and cards.

Each color has a light and a dark value. The **Preview** switch chooses which one you are editing and shows the page in that mode. Text colors show their contrast against the background they sit on; anything below 4.5 : 1 is flagged, because some students will not be able to read it.

| Control | What it does |
|---|---|
| Undo | Steps back one change. |
| Reset | Goes back to the saved theme. Undo brings your changes back. |
| Save | Writes `_data/theme.json` through the dev server. |
| Download | Saves the same file to your computer instead, for sending to someone else. |
| × | Hides the panel. The tab brings it back. |

Escape collapses the panel to its title bar; select the title to expand it again. The panel remembers whether it was open, and keeps unsaved changes until the browser tab closes.

On a narrow screen the panel becomes a sheet along the bottom edge.

On a slide deck the panel lists the colors decks use, and edits there go to the `deck` section of `theme.json` when that section already sets the color.

## What it writes

The same file you would write by hand (see the Theme section of the README and `docs/tokens.md`). A color the panel changes is stored as a `{ "light", "dark" }` pair. Colors you did not touch are not written, so the package defaults still apply to them. The file is checked against `schemas/theme.schema.json` before it is written; a bad value is refused and the file is left as it was.

## How it works

- `assets/scripts/theme-panel.js` defines `<theme-panel context="site|deck">`. The layouts add it, and its script, only when the `themePanel` global data is true, which is every build except production.
- The panel is a `popover="manual"` element, so it sits in the top layer above the page without a z-index. It is docked at the center of the right edge with `position: fixed` and logical insets, and scrolls on its own when it is taller than the window.
- The collapse is a `<details>` element; the groups are `<fieldset>`s with `<legend>`s; every input has a label; contrast results are `<output>` elements; the panel is a landmark (`<aside>`) named by its heading.
- Preview edits set `--color-*` custom properties inline on `<html>`, so they win over the stylesheet until the page reloads.
- `lib/theme-server.js` adds `GET` and `POST /.course-kit/theme` to the Eleventy dev server. `POST` accepts JSON from the same origin only, up to 64 KB.

## Known limits

- Deleting `theme.json` by hand while `yarn start` is running does not rebuild the site; Eleventy only rebuilds on changes and additions. Restart, or save an empty theme (`{}`) instead.
- In a browser without popover support, the panel is a plain fixed element that the tab shows and hides. It still works, but can sit under page content that sets its own stacking.
